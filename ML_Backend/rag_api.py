from flask import Flask, request, jsonify
import google.generativeai as genai
import os
import PyPDF2 # Using PyPDF2 for PDF reading
import chromadb
from chromadb.utils import embedding_functions
import uuid # To generate unique IDs for document chunks

app = Flask(__name__)

# Configure Gemini API - Use environment variable for the API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.")
    # In a production app, you might want to raise an exception or handle this more gracefully
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API configured.")

# Configure Gemini Embedding Function for ChromaDB
if GEMINI_API_KEY:
    # Specify the correct model for embeddings if needed, 'models/embedding-001' is common
    gemini_ef = embedding_functions.GoogleEmbeddingFunction(api_key=GEMINI_API_KEY, model_name="models/embedding-001")
    print("Gemini Embedding Function configured.")
else:
    # Handle case where API key is not set - cannot create embedding function
    gemini_ef = None
    print("Warning: Gemini Embedding Function not configured due to missing API key.")


# Initialize ChromaDB Client
# Running in-memory for simplicity. For persistence, configure a directory:
# client = chromadb.PersistentClient(path="./chroma_db")
client = chromadb.Client() # In-memory client

# Get or create a collection
# Use the configured embedding function
collection = None # Initialize collection variable
try:
    if gemini_ef:
        # Pass the embedding function when getting or creating the collection
        collection = client.get_or_create_collection(name="teacher_documents", embedding_function=gemini_ef)
        print("ChromaDB collection 'teacher_documents' initialized with Gemini Embedding Function.")
    else:
        # If embedding function is not available, create the collection without it
        # This collection won't be able to perform vector searches correctly
        collection = client.get_or_create_collection(name="teacher_documents")
        print("ChromaDB collection 'teacher_documents' initialized without an embedding function.")
        print("Document uploads and questions will not work correctly without a configured Gemini API Key and Embedding Function.")
except Exception as e:
    print(f"Error initializing ChromaDB or collection: {e}")
    collection = None # Set collection to None if initialization fails


# Basic text chunking function
def chunk_text(text, chunk_size=500, overlap_size=100):
    """Splits text into overlapping chunks."""
    chunks = []
    if not text:
        return chunks
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:min(end, len(text))]
        chunks.append(chunk)
        start += chunk_size - overlap_size if chunk_size > overlap_size else chunk_size
    return chunks

# Basic PDF text extraction
def extract_text_from_pdf(pdf_file):
    """Extracts text from a PDF file object."""
    text = ""
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        for page_num in range(len(reader.pages)):
            # Use .extract_text() from the page object
            page_text = reader.pages[page_num].extract_text()
            if page_text:
                text += page_text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None # Return None to indicate failure
    return text


@app.route('/upload-document', methods=['POST'])
def upload_document():
    """Endpoint to upload and process teacher documents."""
    if not collection or not gemini_ef:
        return jsonify({"error": "RAG system is not fully configured (Missing Vector DB collection or Embedding function)."}), 500

    if 'document' not in request.files:
        return jsonify({"error": "No 'document' file part in the request"}), 400

    file = request.files['document']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        filename = file.filename
        text = ""
        try:
            if filename.lower().endswith('.txt'):
                text = file.read().decode('utf-8', errors='ignore')
            elif filename.lower().endswith('.pdf'):
                # Need to reset stream position after reading
                file.seek(0)
                text = extract_text_from_pdf(file)
                if text is None: # Check if PDF extraction failed
                    return jsonify({"error": f"Failed to extract text from PDF file '{filename}'."}), 400
            else:
                return jsonify({"error": "Unsupported file type. Only .txt and .pdf are supported."}), 400

            if not text.strip(): # Check if extracted text is empty or just whitespace
                 return jsonify({"error": "Could not extract any usable text from the document."}), 400

            chunks = chunk_text(text)

            if not chunks:
                 return jsonify({"error": "No text chunks were created from the document."}), 400

            # Prepare data for ChromaDB
            documents_to_add = chunks
            # Embeddings will be generated by ChromaDB using the configured function
            metadatas_to_add = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]
            # Generate unique IDs for each chunk
            ids_to_add = [str(uuid.uuid4()) for _ in range(len(chunks))]

            # Add to ChromaDB
            # ChromaDB will automatically generate embeddings because an embedding_function was provided
            collection.add(
                documents=documents_to_add,
                metadatas=metadatas_to_add,
                ids=ids_to_add
            )

            print(f"Uploaded and processed {filename}. Added {len(chunks)} chunks to ChromaDB.")
            return jsonify({"message": f"Document '{filename}' uploaded and processed. {len(chunks)} chunks added to vector store."}), 200

        except Exception as e:
            print(f"Error processing document {filename}: {e}")
            # General error during processing
            return jsonify({"error": f"An error occurred during document processing: {e}"}), 500
    else:
        # This case should ideally be caught by the 'No selected file' check, but as a fallback
        return jsonify({"error": "No file received for processing."}), 400


@app.route('/ask-question', methods=['POST'])
def ask_question():
    """Endpoint to receive student questions and generate answers using RAG."""
    # Ensure ChromaDB collection and embedding function are ready
    if not collection or not gemini_ef:
        return jsonify({"error": "RAG system not fully initialized (Vector database collection or Embedding function missing)."}), 500

    data = request.json
    question = data.get('question')

    if not question or not question.strip():
        return jsonify({"error": "No question provided"}), 400

    try:
        # 1. Generate embedding for the question (ChromaDB handles this during query)
        # 2. Retrieve relevant document chunks from ChromaDB
        results = collection.query(
            query_texts=[question],
            n_results=5 # Retrieve top N most relevant chunks
            # You could add filters here based on metadata if needed (e.g., filter by teacher, topic)
        )

        # Extract document chunks from results
        # results structure: {'ids': [['id1', 'id2', ...]], 'documents': [['chunk1', 'chunk2', ...]], 'metadatas': [[{...}, {...}, ...]], ...}
        # Get documents for the first query (the question)
        retrieved_chunks = results.get('documents', [[]])[0]
        retrieved_metadatas = results.get('metadatas', [[]])[0]


        if not retrieved_chunks:
             print(f"No relevant document chunks found for question: '{question}'")
             # Fallback: Ask Gemini without specific context, or return a specific message
             model = genai.GenerativeModel('gemini-pro') # Use a generative model
             fallback_prompt = f"""Could not find specific information in the provided documents. Please answer the following question to the best of your ability based on your general knowledge.
If you cannot answer, say "I cannot answer this question based on the available information or my general knowledge."

Question: {question}

Answer:
"""
             response = model.generate_content(fallback_prompt)
             answer = response.text
             # Return the fallback answer and indicate no source chunks were used
             return jsonify({"answer": answer, "source_chunks": [], "source_metadata": []}), 200


        # 3. Format retrieved chunks as context for Gemini
        # You can choose how to format the context. Joining with a separator is common.
        context = "
---
".join(retrieved_chunks)

        # Use Gemini to generate a response based on the question and retrieved chunks
        model = genai.GenerativeModel('gemini-pro') # Use a generative model

        # Craft the prompt including the context
        prompt = f"""You are an AI assistant that answers questions based *only* on the provided documents.
If the question cannot be answered using the information in the documents, state that you cannot answer based on the available documents.

Documents:
{context}

Question: {question}

Answer:
"""
        print("Sending prompt to Gemini:
", prompt)
        response = model.generate_content(prompt)
        answer = response.text

        # Return the generated answer and the source chunks/metadata
        return jsonify({"answer": answer, "source_chunks": retrieved_chunks, "source_metadata": retrieved_metadatas}), 200

    except Exception as e:
        print(f"Error in ask-question endpoint: {e}")
        # Catch specific Gemini errors if needed, e.g., API rate limits
        return jsonify({"error": f"Failed to process question or generate response: {e}"}), 500

if __name__ == '__main__':
    # You might want to run this with a production server like Gunicorn in deployment
    # For development, you can run it directly
    # Running on port 5001, assuming your main backend is on a different port
    # Set debug=False for production
    app.run(debug=True, port=5001)