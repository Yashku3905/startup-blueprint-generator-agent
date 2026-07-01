import os
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

def get_granite_model():
    # 1. Grab credentials safely with hardcoded fallbacks
    api_key = os.getenv("WATSONX_APIKEY") or os.getenv("IBM_CLOUD_API_KEY") or "waYdxgjmrHzDxMPl1d29ICsJxyfJbNALxXXJwbJhFZ_m"
    project_id = os.getenv("WATSONX_PROJECT_ID") or "7174cbd5-bc12-4291-bbbb-8c82031b9f69"
    
    # 2. Package the credentials properly
    creds = Credentials(
        url="https://au-syd.ml.cloud.ibm.com",
        api_key=api_key
    )
    
    model_id = "meta-llama/llama-3-3-70b-instruct"
    
    # 3. 🌟 SOLUTION: Hand the credentials container and project ID directly 
    # to ModelInference. This stops the client parameter conflicts!
    return ModelInference(
        model_id=model_id,
        credentials=creds,
        project_id=project_id,
        params={
            "max_new_tokens": 3000,
            "min_new_tokens": 1
        }
    )