import os

# 1. 🌟 Set BOTH standard IBM environment keys so the SDK captures them on import
API_KEY = "waYdxgjmrHzDxMPl1d29ICsJxyfJbNALxXXJwbJhFZ_m"
os.environ["WATSONX_APIKEY"] = API_KEY        # 👈 Standard for modern Watsonx SDK
os.environ["IBM_CLOUD_API_KEY"] = API_KEY    # 👈 Backup for Cloudant/alternative setups
os.environ["WATSONX_PROJECT_ID"] = "7174cbd5-bc12-4291-bbbb-8c82031b9f69"

# 2. Standard library & framework imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ibmcloudant.cloudant_v1 import CloudantV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

# 3. Import your custom service AFTER keys are globally set
from granite_service import get_granite_model

# 4. RAG-related imports
try:
    from langchain_community.vectorstores import FAISS
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
    except ImportError:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    RAG_AVAILABLE = True
except Exception as e:
    print(f"RAG Imports not available yet (packages still installing?): {e}")
    RAG_AVAILABLE = False

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cloudant Setup
CLOUDANT_URL = "https://5d64abde-aee2-401e-ae24-0f0634e3f599-bluemix.cloudantnosqldb.appdomain.cloud"
try:
    authenticator = IAMAuthenticator(API_KEY)
    cloudant_client = CloudantV1(authenticator=authenticator)
    cloudant_client.set_service_url(CLOUDANT_URL)
except Exception as e:
    print(f"Cloudant initialization failed: {e}")
    cloudant_client = None

# Load Vector Database on Startup
db = None
if RAG_AVAILABLE:
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(current_dir, "faiss_index")
        if os.path.exists(db_path):
            print(f"Loading FAISS index from: {db_path}")
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            db = FAISS.load_local(db_path, embeddings, allow_dangerous_deserialization=True)
            print("FAISS index loaded successfully.")
        else:
            print(f"FAISS index folder not found at {db_path}. RAG will be disabled until ingestion runs.")
    except Exception as e:
        print(f"Error loading FAISS index: {e}")

class StartupRequest(BaseModel):
    idea: str

@app.post("/api/generate")
def generate_blueprint(request: StartupRequest):
    global db
    try:
        # Reload db if it wasn't loaded but is now available
        if db is None and RAG_AVAILABLE:
            try:
                current_dir = os.path.dirname(os.path.abspath(__file__))
                db_path = os.path.join(current_dir, "faiss_index")
                if os.path.exists(db_path):
                    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
                    db = FAISS.load_local(db_path, embeddings, allow_dangerous_deserialization=True)
            except Exception:
                pass

        # Perform RAG retrieval
        context = ""
        if db is not None:
            try:
                docs = db.similarity_search(request.idea, k=3)
                context = "\n---\n".join([doc.page_content for doc in docs])
                print("Successfully retrieved RAG context.")
            except Exception as search_err:
                print(f"RAG search error: {search_err}")
                context = "Startup India offers seed fund schemes up to 20 Lakhs for DPIIT recognized startups."
        else:
            context = "Startup India offers seed fund schemes up to 20 Lakhs for DPIIT recognized startups."

        model = get_granite_model()
        
        prompt = f"""
        You are an elite business strategist and startup consultant. Build a highly structured, complete, and actionable startup blueprint based on the following retrieved context and the user's startup idea.
        
        Retrieved context from policy, funding, and legal databases:
        {context}
        
        Startup Idea:
        {request.idea}
        
        Provide the output in strict Markdown formatting. You MUST include the following exact sections with their headers:
        
        # Executive Report: Business Blueprint
        
        ### 1. Executive Summary
        - High-level overview of the concept and its viability.
        - A short description of the business model.
        
        ### 2. Business Model Canvas
        Provide a detailed breakdown covering:
        - **Value Propositions**: What unique value does it offer?
        - **Customer Segments**: Who are the primary customers?
        - **Channels**: How will you reach them?
        - **Customer Relationships**: How will you keep them engaged?
        - **Key Activities**: What needs to be done to deliver the product?
        - **Key Resources**: What assets are required?
        - **Key Partners**: Who are key allies?
        - **Cost Structure**: What are the main costs?
        - **Revenue Streams**: How does it monetize?
        
        ### 3. Go-to-Market (GTM) Strategy
        - How to launch the product and gain initial traction.
        - Customer acquisition channels and launch milestones.
        
        ### 4. Suggested Indian Government Schemes & Legal Requirements
        - Specify relevant schemes based on the retrieved context (e.g. Startup India Seed Fund, SAMRIDH, DPIIT Recognition benefits, tax exemptions).
        - Provide incorporation steps (e.g., Private Limited, LLP) and regulatory registrations (PAN, TAN, GST) relevant to this industry.
        
        ### 5. Recommended Investors & Incubators
        - Suggest suitable incubator networks (e.g., SINE, CIIE, FITT, T-Hub) or accelerator programs.
        - List investor types and angel networks appropriate for this stage.
        
        ### 6. Estimated Budget Execution Plan
        - A standard budget breakdown based on typical startup allocations (Product Dev, Marketing/GTM, Operations, Legal/Compliance).
        - Outline runway recommendations and burn rate targets.
        
        Ensure all sections are completely filled with actionable, detailed recommendations. Avoid placeholders.
        """
        
        blueprint_response = model.generate_text(prompt=prompt)
        
        # Safe log to database
        if cloudant_client:
            try:
                document = {"idea": request.idea, "type": "blueprint_meta"}
                cloudant_client.post_document(db="startup_blueprints", document=document)
            except Exception as db_err:
                print(f"Database logging skipped: {db_err}")
 
        return {"blueprint": blueprint_response}
        
    except Exception as e:
        print(f"CRITICAL BACKEND ERROR: {e}")
        return {"error": str(e)}