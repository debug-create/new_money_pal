import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class TransactionCategorizer:
    def __init__(self):
        # 1. FAST MATCH (Keep your specific keywords)
        self.keyword_map = {
            "swiggy": "Food & Dining", "zomato": "Food & Dining", "dominos": "Food & Dining", "kfc": "Food & Dining",
            "uber": "Transport", "ola": "Transport", "rapido": "Transport", "fuel": "Transport", "petrol": "Transport",
            "netflix": "Entertainment", "spotify": "Entertainment", "pvr": "Entertainment",
            "amazon": "Shopping", "flipkart": "Shopping", "myntra": "Shopping", "zudio": "Shopping",
            "jio": "Utilities", "bescom": "Utilities", "wifi": "Utilities", "airtel": "Utilities",
            "pharmacy": "Health", "apollo": "Health",
            "salary": "Income", "rent": "Housing", "sip": "Investments"
        }
        
        # 2. SMART MATCH (AI Fallback)
        self.ai_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def categorize(self, description: str, merchant: str = None) -> dict:
        text = f"{description} {merchant or ''}".lower()
        
        # A. Try Fast Rules First (Latency < 1ms)
        for keyword, category in self.keyword_map.items():
            if keyword in text:
                return {"category": category, "confidence": 0.95, "method": "keyword"}
        
        # B. Ask AI (Latency ~500ms) - Handles "Starbucks", "Auto", "Chai"
        try:
            prompt = f"""
            Categorize this transaction: "{text}"
            
            Options: [Food & Dining, Transport, Shopping, Groceries, Utilities, Health, Entertainment, Education, Travel, Investments, Income, Housing]
            
            OUTPUT ONLY THE CATEGORY NAME. NO EXTRA TEXT.
            """
            
            completion = self.ai_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.1
            )
            
            category = completion.choices[0].message.content.strip()
            return {"category": category, "confidence": 0.85, "method": "ai"}
            
        except Exception as e:
            print(f"AI Categorization Failed: {e}")
            return {"category": "General", "confidence": 0.5, "method": "fallback"}