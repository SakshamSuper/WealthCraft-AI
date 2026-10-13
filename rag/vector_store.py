import os
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Optional imports for OpenAI + FAISS
try:
    from langchain_community.vectorstores import FAISS
    from langchain_openai import OpenAIEmbeddings
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False

class FinancialRAG:
    """
    Retrieval-Augmented Generation (RAG) system for Stockify AI.
    Loads and indexes financial regulatory documents and definitions.
    Falls back to a local TF-IDF matcher if no OpenAI key is available.
    """
    def __init__(self, kb_dir: str = None):
        if not kb_dir:
            # Default directory structure
            self.kb_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "rag", "knowledge_base"
            )
        else:
            self.kb_dir = kb_dir
            
        self.chunks: List[str] = []
        self.sources: List[str] = []
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.vector_store = None
        
        # Load and Index on init
        self._load_documents()
        self._build_index()

    def _load_documents(self):
        """Loads and splits txt files from the knowledge base directory."""
        if not os.path.exists(self.kb_dir):
            # Create if it doesn't exist
            os.makedirs(self.kb_dir, exist_ok=True)
            
        for file_name in os.listdir(self.kb_dir):
            if file_name.endswith(".txt"):
                file_path = os.path.join(self.kb_dir, file_name)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Split documents by double newlines (paragraphs)
                    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                    for p in paragraphs:
                        self.chunks.append(p)
                        self.sources.append(file_name)
                except Exception as e:
                    print(f"Error reading RAG knowledge file {file_name}: {e}")
                    
        # Fallback if no files found
        if not self.chunks:
            self.chunks.append("Stockify AI: Leading Mutual Fund Recommendation platform using AI.")
            self.sources.append("default.txt")

    def _build_index(self):
        """Indexes the chunks. Uses FAISS/OpenAI if available, else TF-IDF."""
        if self.openai_api_key and HAS_LANGCHAIN:
            try:
                # Use langchain FAISS + OpenAI
                embeddings = OpenAIEmbeddings(openai_api_key=self.openai_api_key)
                self.vector_store = FAISS.from_texts(
                    texts=self.chunks,
                    embedding=embeddings,
                    metadatas=[{"source": src} for src in self.sources]
                )
                print("RAG: Successfully indexed documents using FAISS + OpenAI Embeddings.")
                return
            except Exception as e:
                print(f"RAG: Failed to build OpenAI vector store: {e}. Falling back to TF-IDF.")
                
        # TF-IDF Fallback
        self.tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.chunks)
        print("RAG: Indexed documents using local TF-IDF Vectorizer.")

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Searches the knowledge base and returns matching chunks with scores."""
        if not self.chunks:
            return []
            
        # Use FAISS if available
        if self.vector_store:
            try:
                docs_and_scores = self.vector_store.similarity_search_with_score(query, k=top_k)
                results = []
                for doc, score in docs_and_scores:
                    results.append({
                        "content": doc.page_content,
                        "source": doc.metadata.get("source", "unknown"),
                        "score": float(score)  # In FAISS, lower L2 distance is better
                    })
                return results
            except Exception as e:
                print(f"RAG: FAISS search failed: {e}. Falling back to TF-IDF.")

        # Local TF-IDF search
        if not self.tfidf_vectorizer:
            return []
            
        query_vec = self.tfidf_vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        
        # Get top K indices sorted descending by similarity
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            # Only include results with positive similarity
            if score > 0.05:
                results.append({
                    "content": self.chunks[idx],
                    "source": self.sources[idx],
                    "score": score
                })
                
        # If no results found, return a default helpful statement
        if not results:
            results.append({
                "content": "For specific mutual fund queries, please refer to SEBI guidelines on asset allocation and equity tax rules.",
                "source": "general_knowledge",
                "score": 0.1
            })
            
        return results
