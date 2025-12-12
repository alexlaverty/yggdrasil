"""Chat endpoint supporting multiple AI providers (Claude and Gemini) with tool calling."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import anthropic
import google.generativeai as genai

# Import MCP tool functions directly
from routers.mcp import (
    find_person_by_name,
    get_person_details,
    get_siblings,
    search_by_birth_location,
    get_birth_date,
    list_all_people
)

router = APIRouter(prefix="/chat", tags=["chat"])


# Request/Response schemas
class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


class ChatResponse(BaseModel):
    response: str
    tool_calls: Optional[List[Dict[str, Any]]] = []
    provider: Optional[str] = None


# Tool execution mapper (same for both providers)
TOOL_FUNCTIONS = {
    "find_person_by_name": find_person_by_name,
    "get_person_details": get_person_details,
    "get_siblings": get_siblings,
    "search_by_birth_location": search_by_birth_location,
    "get_birth_date": get_birth_date,
    "list_all_people": list_all_people
}


# System prompt (same for both providers)
SYSTEM_PROMPT = """You are a helpful genealogy assistant with access to a family history database.
You can help users explore their family tree, find information about people, relationships,
birth/death dates, and locations. When answering questions:
- Use the available tools to query the database
- Be conversational and friendly
- Provide context and explain relationships clearly
- If you need more information, ask clarifying questions
- When you find multiple matches, help the user narrow down the search"""


# Tool definitions for Claude API (Anthropic format)
CLAUDE_TOOLS = [
    {
        "name": "find_person_by_name",
        "description": "Find a person in the genealogy database by their first name and/or last name. Returns matching people with their IDs and birth dates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {
                    "type": "string",
                    "description": "The person's first name (optional)"
                },
                "last_name": {
                    "type": "string",
                    "description": "The person's last name (optional)"
                }
            }
        }
    },
    {
        "name": "get_person_details",
        "description": "Get detailed information about a person including birth, death, parents, spouses, and children.",
        "input_schema": {
            "type": "object",
            "properties": {
                "person_id": {
                    "type": "integer",
                    "description": "The database ID of the person"
                }
            },
            "required": ["person_id"]
        }
    },
    {
        "name": "get_siblings",
        "description": "Get all siblings of a person (people who share the same parents).",
        "input_schema": {
            "type": "object",
            "properties": {
                "person_id": {
                    "type": "integer",
                    "description": "The database ID of the person"
                }
            },
            "required": ["person_id"]
        }
    },
    {
        "name": "search_by_birth_location",
        "description": "Find all people born in a specific location. Partial matches are allowed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The birth location to search for"
                }
            },
            "required": ["location"]
        }
    },
    {
        "name": "get_birth_date",
        "description": "Get the birth date and location of a person.",
        "input_schema": {
            "type": "object",
            "properties": {
                "person_id": {
                    "type": "integer",
                    "description": "The database ID of the person"
                }
            },
            "required": ["person_id"]
        }
    },
    {
        "name": "list_all_people",
        "description": "List all people in the genealogy database with their IDs and birth years. Returns up to 50 people.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    }
]


# Tool definitions for Gemini API (Google format)
GEMINI_TOOLS = [
    genai.protos.FunctionDeclaration(
        name="find_person_by_name",
        description="Find a person in the genealogy database by their first name and/or last name. Returns matching people with their IDs and birth dates.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "first_name": genai.protos.Schema(type=genai.protos.Type.STRING, description="The person's first name (optional)"),
                "last_name": genai.protos.Schema(type=genai.protos.Type.STRING, description="The person's last name (optional)")
            }
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_person_details",
        description="Get detailed information about a person including birth, death, parents, spouses, and children.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "person_id": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="The database ID of the person")
            },
            required=["person_id"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_siblings",
        description="Get all siblings of a person (people who share the same parents).",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "person_id": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="The database ID of the person")
            },
            required=["person_id"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="search_by_birth_location",
        description="Find all people born in a specific location. Partial matches are allowed.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "location": genai.protos.Schema(type=genai.protos.Type.STRING, description="The birth location to search for")
            },
            required=["location"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_birth_date",
        description="Get the birth date and location of a person.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "person_id": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="The database ID of the person")
            },
            required=["person_id"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="list_all_people",
        description="List all people in the genealogy database with their IDs and birth years. Returns up to 50 people.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={}
        )
    )
]


def chat_with_claude(messages: List[Dict], all_tool_calls: List) -> str:
    """Handle chat using Anthropic Claude API."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY not configured. Please add it to your .env file."
        )

    # Get model from environment (default to sonnet)
    model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")

    client = anthropic.Anthropic(api_key=api_key)

    # Agentic loop: continue until we get a text response
    max_iterations = 10
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Call Claude API
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=CLAUDE_TOOLS
        )

        # Check if Claude wants to use tools
        if response.stop_reason == "tool_use":
            # Extract tool use requests
            tool_uses = [
                block for block in response.content
                if block.type == "tool_use"
            ]

            # Execute each tool
            tool_results = []
            for tool_use in tool_uses:
                tool_name = tool_use.name
                tool_input = tool_use.input
                tool_use_id = tool_use.id

                print(f"[Claude] Executing tool: {tool_name} with input: {tool_input}")
                all_tool_calls.append({
                    "name": tool_name,
                    "input": tool_input
                })

                # Execute the tool
                try:
                    tool_function = TOOL_FUNCTIONS[tool_name]
                    result = tool_function(**tool_input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": str(result)
                    })
                except Exception as e:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": f"Error executing tool: {str(e)}",
                        "is_error": True
                    })

            # Add assistant's response and tool results to conversation
            messages.append({
                "role": "assistant",
                "content": response.content
            })
            messages.append({
                "role": "user",
                "content": tool_results
            })

        else:
            # Got final text response
            text_content = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text_content += block.text

            return text_content

    raise HTTPException(
        status_code=500,
        detail="Maximum tool execution iterations reached"
    )


def chat_with_gemini(messages: List[Dict], all_tool_calls: List) -> str:
    """Handle chat using Google Gemini API."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY not configured. Please add it to your .env file."
        )

    # Get model from environment (default to flash)
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    genai.configure(api_key=api_key)

    # Create model with tools
    model = genai.GenerativeModel(
        model_name=model_name,
        tools=GEMINI_TOOLS,
        system_instruction=SYSTEM_PROMPT
    )

    # Start chat session
    chat = model.start_chat(enable_automatic_function_calling=False)

    # Convert messages to Gemini format and send history
    for msg in messages[:-1]:  # All messages except the last one
        role = "user" if msg["role"] == "user" else "model"
        chat.history.append({
            "role": role,
            "parts": [msg["content"]]
        })

    # Get the last user message
    last_message = messages[-1]["content"]

    # Agentic loop
    max_iterations = 10
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Send message to Gemini
        response = chat.send_message(last_message)

        # Check if Gemini wants to use tools
        if response.candidates[0].content.parts:
            has_function_call = False

            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    has_function_call = True
                    function_call = part.function_call
                    tool_name = function_call.name
                    tool_args = dict(function_call.args)

                    print(f"[Gemini] Executing tool: {tool_name} with input: {tool_args}")
                    all_tool_calls.append({
                        "name": tool_name,
                        "input": tool_args
                    })

                    # Execute the tool
                    try:
                        tool_function = TOOL_FUNCTIONS[tool_name]
                        result = tool_function(**tool_args)

                        # Send function response back to Gemini
                        function_response = genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=tool_name,
                                response={"result": str(result)}
                            )
                        )

                        # Continue conversation with function result
                        last_message = function_response
                        break  # Break to send this result and continue loop

                    except Exception as e:
                        function_response = genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=tool_name,
                                response={"error": str(e)}
                            )
                        )
                        last_message = function_response
                        break

            # If no function calls, we got the final text response
            if not has_function_call:
                return response.text

        else:
            # No parts means we got a text response
            return response.text

    raise HTTPException(
        status_code=500,
        detail="Maximum tool execution iterations reached"
    )


@router.post("")
async def chat(request: ChatRequest):
    """
    Chat endpoint that supports multiple AI providers (Claude or Gemini).
    Provider is selected via AI_PROVIDER environment variable.
    """
    # Get provider from environment
    provider = os.getenv("AI_PROVIDER", "claude").lower()

    if provider not in ["claude", "gemini"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid AI_PROVIDER: {provider}. Must be 'claude' or 'gemini'."
        )

    # Convert request messages to provider format
    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]

    # Track tool calls for response metadata
    all_tool_calls = []

    # Route to appropriate provider
    try:
        if provider == "claude":
            response_text = chat_with_claude(messages, all_tool_calls)
        else:  # gemini
            response_text = chat_with_gemini(messages, all_tool_calls)

        return ChatResponse(
            response=response_text,
            tool_calls=all_tool_calls,
            provider=provider
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error with {provider} API: {str(e)}"
        )
