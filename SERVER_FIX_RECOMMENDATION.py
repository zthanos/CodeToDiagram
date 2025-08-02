# RECOMMENDED SERVER FIX
# In your generate_stream method, change this:

async for line in response.aiter_lines():
    if not line.strip():
        continue
    try:
        data = json.loads(line)
        chunk = data.get("response", "")
        if chunk:
            full_response += chunk
            yield chunk  # ❌ This sends plain text
        
        # Check if this is the final response
        if data.get("done", False):
            break
    except json.JSONDecodeError:
        self.logger.error(f"Failed to parse JSON from Ollama: {line}")
        continue

# TO THIS:

async for line in response.aiter_lines():
    if not line.strip():
        continue
    try:
        data = json.loads(line)
        chunk = data.get("response", "")
        if chunk:
            full_response += chunk
            # ✅ Wrap chunk in JSON format expected by client
            chunk_data = {
                "content": chunk,
                "prompt_key": prompt_key
            }
            yield json.dumps(chunk_data)  # Send JSON string
        
        # Check if this is the final response
        if data.get("done", False):
            break
    except json.JSONDecodeError:
        self.logger.error(f"Failed to parse JSON from Ollama: {line}")
        continue