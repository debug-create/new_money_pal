import httpx
from app.config import settings
import pandas as pd
import pypdf
import io
import json

class AIService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        # Groq OpenAI-compatible endpoint
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama3-70b-8192"  # Using Llama 3 for good financial reasoning

    def _extract_text_from_file(self, file_bytes: bytes, filename: str) -> str:
        """Helper to extract raw text from PDF or CSV bytes"""
        try:
            filename = filename.lower()
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_bytes))
                return f"CSV Data:\n{df.to_string()}\n"
            elif filename.endswith('.pdf'):
                pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text = ""
                # Safety: Only read first 5 pages to stay within token quotas
                num_pages = min(len(pdf_reader.pages), 5)
                for i in range(num_pages):
                    text += pdf_reader.pages[i].extract_text() + "\n"
                return f"PDF Document Content (Top {num_pages} pages):\n{text}\n"
            return ""
        except Exception as e:
            return f"Error reading file: {str(e)}"

    async def generate_response(self, prompt: str, file_bytes: bytes = None, filename: str = None):
        try:
            file_context = ""
            if file_bytes and filename:
                extracted_text = self._extract_text_from_file(file_bytes, filename)
                file_context = f"\n\n--- USER UPLOADED FILE ({filename}) ---\n{extracted_text}\n----------------\n"

            system_instruction = "You are FinWise AI, a helpful financial coach. Analyze the user's data and provide brief, professional advice."
            
            # Construct messages for Groq (OpenAI format)
            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"{file_context}\nUser Query: {prompt}"}
            ]

            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.7
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url, 
                    json=payload,
                    headers=headers,
                    timeout=30.0 
                )
                
                if response.status_code == 429:
                    print("Quota hit on Groq API")
                    return "ERROR_QUOTA_EXCEEDED"

                if response.status_code != 200:
                    print(f"API Error: {response.text}")
                    return "I'm having trouble connecting to my brain. Please try again in a moment."

                data = response.json()
                # Parse Groq/OpenAI format response
                return data['choices'][0]['message']['content']
            
        except Exception as e:
            print(f"Generation Error: {str(e)}")
            return "I encountered an error while analyzing your request."

ai_service = AIService()