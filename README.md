# Contract Information Extractor

This FastAPI-based application allows users to upload a PDF or Word document, extracts key contract details using Azure OpenAI's GPT-4 model, and returns structured contract information. The application supports document types like PDF and Word, processes the text, splits contracts, and extracts details related to terms, obligations, dates, and other relevant sections.

## Features

- **File Upload**: Supports PDF and Word document uploads.
- **Contract Text Extraction**: Automatically extracts text from uploaded contracts.
- **Contract Section Extraction**: Extracts key contract details such as:
  - Termination and Amendment Terms
  - Obligations and Deliverables
  - Key Dates and Deadlines
  - Payment and Fee Structures
  - Party Information
  - Type of Contract
  - Jurisdiction and Governing Laws
  - Confidentiality and Non-Disclosure
- **Result Download**: Extracted data can be downloaded as a structured JSON file.
- **Web Interface**: Simple front-end to interact with the system.

## Requirements

- Python 3.8+
- Azure OpenAI API credentials
- PyMuPDF
- python-docx
- FastAPI
- Uvicorn

## Usage

1. Run the FastAPI application:
    ```bash
    uvicorn main:app --reload
    ```

2. Navigate to `http://127.0.0.1:8000` in your browser to access the web interface.
   - Upload a PDF or Word document containing a contract.
   - The application will extract key contract sections and display the results in JSON format.

3. You can download the extracted data by clicking the download link for the output file.

## Endpoints

### `GET /`
- Serves the index HTML page with the file upload form.

### `POST /extract`
- Uploads a contract file (PDF or Word) and extracts contract information.
- **Request**:
    - `file` (required): A PDF or Word file to process.
- **Response**:
    - A JSON response containing the extracted contract details.

### `GET /download`
- Provides a link to download the extracted data as a JSON file.
- **Response**:
    - A JSON file with structured contract details.

## Example Response (JSON)

```json
{
  "results": {
    "Contract 1": {
      "termination_and_amendment_terms": "Details about termination and amendments...",
      "obligations_and_deliverables": "Details about obligations and deliverables...",
      "key_dates_and_deadlines": "2025-03-01, 2025-05-01",
      "payment_and_fee_structures": "Details about payment and fee structures...",
      "party_information": "Party A: XYZ Corp, Party B: ABC Ltd.",
      "type_of_contract": "Employment Agreement",
      "jurisdiction_and_governing_laws": "Laws of the State of California",
      "confidentiality_and_non_disclosure": "Details about confidentiality..."
    }
  },
  "download_url": "/static/output.json"
}
