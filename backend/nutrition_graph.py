"""LangGraph agent: Claude + nutrition system prompt (single-turn per request for issue #4)."""

from __future__ import annotations

import uuid

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, MessagesState, StateGraph

SYSTEM_PROMPT = """You are a professional nutritionist and diet coach. Help users with meal planning,
calorie tracking, macro analysis, food choices, and healthy eating habits.
When analyzing food images, provide detailed nutritional estimates."""

MODEL_NAME = "claude-sonnet-4-20250514"

_graph = None


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


def run_nutrition_chat(decrypted_api_key: str, user_message: str) -> tuple[str, str]:
    """Return (assistant_text, conversation_id). Memory per session lands in issue #6."""
    graph = get_graph()
    cfg: RunnableConfig = {"configurable": {"anthropic_api_key": decrypted_api_key}}
    out = graph.invoke({"messages": [HumanMessage(content=user_message)]}, cfg)
    last = out["messages"][-1]
    body = getattr(last, "content", "")
    text = body if isinstance(body, str) else str(body)
    return text, str(uuid.uuid4())
