import json

async def generate_stream(self, prompt: str, prompt_key: str = "unknown", 
                         system_prompt: Optional[str] = None, 
                         options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
    """Generate a streaming response from the LLM with proper SSE JSON format."""
    
    # ... existing setup code ...
    
    try:
        async with httpx.AsyncClient(timeout=2000.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                
                full_response = ""
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            full_response += chunk
                            
                            # ✅ Format as proper JSON for SSE
                            chunk_data = {
                                "content": chunk,
                                "prompt_key": prompt_key
                            }
                            yield json.dumps(chunk_data)  # This sends: {"content": "text", "prompt_key": "unknown"}
                        
                        # Check if this is the final response
                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        self.logger.error(f"Failed to parse JSON from Ollama: {line}")
                        continue
                        
        # ... rest of your existing code ...