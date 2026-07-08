import os
from langchain_core.embeddings import Embeddings as LangChainEmbeddings
from ibm_watsonx_ai.foundation_models import Embeddings as WatsonxSDKEmbeddings
from ibm_watsonx_ai import Credentials

class WatsonxEmbeddingsWrapper(LangChainEmbeddings):
    def __init__(self):
        api_key = os.getenv("WATSONX_APIKEY") or os.getenv("IBM_CLOUD_API_KEY") or "waYdxgjmrHzDxMPl1d29ICsJxyfJbNALxXXJwbJhFZ_m"
        project_id = os.getenv("WATSONX_PROJECT_ID") or "7174cbd5-bc12-4291-bbbb-8c82031b9f69"
        
        credentials = Credentials(
            api_key=api_key,
            url="https://au-syd.ml.cloud.ibm.com"
        )
        self.client = WatsonxSDKEmbeddings(
            model_id="intfloat/multilingual-e5-large",
            credentials=credentials,
            project_id=project_id
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.client.embed_documents(texts=texts)

    def embed_query(self, text: str) -> list[float]:
        return self.client.embed_query(text=text)

def get_embeddings():
    return WatsonxEmbeddingsWrapper()
