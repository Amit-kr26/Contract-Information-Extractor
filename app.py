import logging
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import fitz 
from openai import AzureOpenAI
from io import BytesIO
from docx import Document
import re
import json
import os

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Azure OpenAI Configuration
client = AzureOpenAI(
    api_key="your_api_key",
    api_version="your_api_version",
    azure_endpoint="your_azure_endpoint"
)


# Initialize FastAPI app
app = FastAPI()

# Mount static files (HTML, CSS, JS) and configure templates
app.mount("/static", StaticFiles(directory="static"), name="static")
# Add a route to serve the output.json file
@app.get("/download")
async def download_output():
    return FileResponse("static/output.json", media_type="application/json", filename="output.json")


class ExtractedData(BaseModel):
    termination_and_amendment_terms: Optional[str] = None
    obligations_and_deliverables: Optional[str] = None
    key_dates_and_deadlines: Optional[str] = None
    payment_and_fee_structures: Optional[str] = None
    party_information: Optional[str] = None
    type_of_contract: Optional[str] = None
    jurisdiction_and_governing_laws: Optional[str] = None
    confidentiality_and_non_disclosure: Optional[str] = None

# Root route
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return FileResponse("static/index.html")

@app.post("/extract", response_class=HTMLResponse)
async def extract_info(request: Request, file: UploadFile = File(...)):
    try:
        logger.info(f"Received file: {file.filename}")
        content = await file.read()
        file_extension = file.filename.split(".")[-1].lower()

        # Extract text based on file type
        if file_extension == "pdf":
            text = extract_text_from_pdf(content)
        elif file_extension in ["doc", "docx"]:
            text = extract_text_from_word(content)
        else:
            logger.warning(f"Unsupported file type: {file_extension}")
            return JSONResponse(status_code=400, content={"message": "Unsupported file type."})

        # Split the document into multiple agreements or contracts
        contracts = split_contracts(text)

        # Prepare results for each contract
        extracted_data_list = []
        for idx, contract in enumerate(contracts):
            logger.debug(f"Processing contract {idx + 1}...")
                        
    
            prompt = (
                "Your task is to carefully analyze the provided contract text and extract the following key details:\n\n"
                "1. Termination and Amendment Terms\n"
                "2. Obligations and Deliverables\n"
                "3. Key Dates and Deadlines\n"
                "4. Payment and Fee Structures\n"
                "5. Party Information\n"
                "6. Type of Contract\n"
                "7. Jurisdiction and Governing Laws\n"
                "8. Confidentiality and Non-Disclosure\n\n"
                "Please only extract information that is explicitly stated in the contract text. If any information is not present, "
                "please indicate that it is not specified.\n\n"
                "Please provide your responses in a clear, structured, and descriptive manner. Avoid formatting the answers with only bold headings or subheadings. Instead, explain the details fully, ensuring they are conveyed in complete sentences with proper context and depth.\n"
                f"Contract Text:\n{contract}"
            )

            # Call Azure OpenAI GPT model
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a contract analysis expert with extensive experience in reviewing and interpreting complex contracts."},
                    {"role": "user", "content": prompt}
                ]
            )

            # Parse GPT response
            extracted_data_text = response.choices[0].message.content
            extracted_data_list.append(parse_extracted_text(extracted_data_text))
            print(extracted_data_text)
        # Save extracted JSON to a file for download
        output_path = "static/output.json"
        with open(output_path, "w") as f:
            json.dump([data.dict() for data in extracted_data_list], f, indent=4)

        # Return the results in a structured format for the frontend
        results_dict = {f"Contract {i + 1}": data.dict() for i, data in enumerate(extracted_data_list)}
        return JSONResponse(content={"results": results_dict, "download_url": "/static/output.json"})

    except Exception as e:
        logger.error("Error during processing:", exc_info=True)
        return JSONResponse(status_code=500, content={"message": "An error occurred during document processing."})


# Utility functions
def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    logger.debug("Extracting text from PDF.")
    pdf_document = fitz.open("pdf", content)
    return "".join([page.get_text() for page in pdf_document])

def extract_text_from_word(content: bytes) -> str:
    """Extract text from a Word document using python-docx."""
    logger.debug("Extracting text from Word document.")
    doc = Document(BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs])

def split_contracts(text: str) -> List[str]:
    """Split the document text into multiple agreements or contracts."""
    logger.debug("Splitting contracts based on delimiter pattern.")
    delimiter_pattern = r"EMPLOYMENT AGREEMENT"
    contracts = re.split(delimiter_pattern, text, flags=re.MULTILINE | re.DOTALL)
    return [contract.strip() for contract in contracts if contract.strip()]
def parse_extracted_text(raw_text: str) -> ExtractedData:
    """Parse the raw GPT response into structured data."""
    logger.debug("Parsing extracted text into structured format.")
    lines = raw_text.split("\n")
    return ExtractedData(
        termination_and_amendment_terms=extract_section(lines, "Termination and Amendment Terms"),
        obligations_and_deliverables=extract_section(lines, "Obligations and Deliverables"),
        key_dates_and_deadlines = extract_section(lines, "Key Dates and Deadlines") or "",
        payment_and_fee_structures=extract_section(lines, "Payment and Fee Structures"),
        party_information=extract_section(lines, "Party Information"),
        type_of_contract=extract_section(lines, "Type of Contract"),
        jurisdiction_and_governing_laws=extract_section(lines, "Jurisdiction and Governing Laws"),
        confidentiality_and_non_disclosure=extract_section(lines, "Confidentiality and Non-Disclosure")
    )

def extract_section(lines: List[str], section: str) -> Optional[str]:
    """Extract a specific section based on its heading."""
    for i, line in enumerate(lines):
        if section in line:
            return lines[i + 1].strip() if i + 1 < len(lines) else None
    return None

def parse_dates(lines: List[str]) -> List[str]:
    """Parse key dates from the extracted text."""
    date_pattern = r"\b\d{4}-\d{2}-\d{2}\b"
    return re.findall(date_pattern, "\n".join(lines))

# Run the application
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI application...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
