import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def main():
    # Setup paths relative to script location
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "data")
    index_dir = os.path.join(current_dir, "faiss_index")
    
    print(f"Loading documents from: {data_dir}")
    if not os.path.exists(data_dir):
        print(f"Error: Data directory {data_dir} does not exist!")
        return

    # Load all txt files
    loader = DirectoryLoader(data_dir, glob="**/*.txt", loader_cls=TextLoader)
    documents = loader.load()
    
    print(f"Loaded {len(documents)} document files.")
    if not documents:
        print("No documents found to index!")
        return
        
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)
    print(f"Split into {len(docs)} text chunks.")
    
    print("Initializing embeddings model (all-MiniLM-L6-v2)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    print("Building FAISS vector index...")
    db = FAISS.from_documents(docs, embeddings)
    
    print(f"Saving index locally to: {index_dir}")
    db.save_local(index_dir)
    print("Ingestion completed successfully!")

if __name__ == "__main__":
    main()
