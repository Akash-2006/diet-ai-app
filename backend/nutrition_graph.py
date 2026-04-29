"""LangGraph agent: Claude + nutrition system prompt + multi-turn memory per conversation_id."""

from __future__ import annotations

import base64
import uuid

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, MessagesState, StateGraph

SYSTEM_PROMPT = """You are a professional nutritionist and diet coach. Help users with meal planning,
calorie tracking, macro analysis, food choices, and healthy eating habits.
When analyzing food images, provide detailed nutritional estimates."""

MODEL_NAME = "claude-sonnet-4-20250514"

_graph = None

# In-memory transcripts (lost on restart; single-worker assumption for MVP).
_conversation_histories: dict[str, list[BaseMessage]] = {}


def _call_model(state: MessagesState, config: RunnableConfig) -> dict:
    api_key = (config.get("configurable") or {}).get("anthropic_api_key")
    if not api_key:
        raise ValueError("Missing anthropic_api_key in runnable config")

    llm = ChatAnthropic(
        anthropic_api_key=api_key,
        model=MODEL_NAME,
        temperature=0.4,
        max_tokens=4096,
    )
    msgs = [SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]
    ai: AIMessage = llm.invoke(msgs)
    return {"messages": [ai]}


def get_graph():
    global _graph
    if _graph is None:
        g = StateGraph(MessagesState)
        g.add_node("agent", _call_model)
        g.add_edge(START, "agent")
        g.add_edge("agent", END)
        _graph = g.compile()
    return _graph


def _assistant_text_from_result(out: dict) -> str:
    last = out["messages"][-1]
    body = getattr(last, "content", "")
    return body if isinstance(body, str) else str(body)


def invoke_graph_with_messages(
    decrypted_api_key: str,
    messages: list[BaseMessage],
) -> tuple[str, list[BaseMessage]]:
    """Run the compiled graph on a full message list (must include the latest user turn)."""
    graph = get_graph()
    cfg: RunnableConfig = {"configurable": {"anthropic_api_key": decrypted_api_key}}
    out = graph.invoke({"messages": messages}, cfg)
    merged = list(out["messages"])
    return _assistant_text_from_result(out), merged


def _resolve_conversation_id(conversation_id: str | None) -> str:
    cid = conversation_id.strip() if conversation_id else ""
    return cid or str(uuid.uuid4())


def run_nutrition_chat(
    decrypted_api_key: str,
    user_message: str,
    conversation_id: str | None,
) -> tuple[str, str]:
    cid = _resolve_conversation_id(conversation_id)
    hist = _conversation_histories.setdefault(cid, [])
    hist.append(HumanMessage(content=user_message))
    reply, merged = invoke_graph_with_messages(decrypted_api_key, hist)
    _conversation_histories[cid] = merged
    return reply, cid


def run_nutrition_image_chat(
    decrypted_api_key: str,
    media_type: str,
    image_bytes: bytes,
    user_caption: str | None,
    conversation_id: str | None,
) -> tuple[str, str]:
    caption = (user_caption or "").strip()
    if not caption:
        caption = "Describe this food and estimate nutrition (calories and macros)."
    b64 = base64.b64encode(image_bytes).decode("ascii")
    media = media_type.strip() if media_type else "application/octet-stream"
    content: list[str | dict] = [
        {"type": "text", "text": caption},
        {"type": "image_url", "image_url": {"url": f"data:{media};base64,{b64}"}},
    ]
    cid = _resolve_conversation_id(conversation_id)
    hist = _conversation_histories.setdefault(cid, [])
    hist.append(HumanMessage(content=content))
    reply, merged = invoke_graph_with_messages(decrypted_api_key, hist)
    _conversation_histories[cid] = merged
    return reply, cid


def reset_conversation(conversation_id: str) -> None:
    if conversation_id:
        _conversation_histories.pop(conversation_id.strip(), None)
