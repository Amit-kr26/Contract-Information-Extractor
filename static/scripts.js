
// scripts.js
const form = document.getElementById('uploadForm');
const resultDiv = document.getElementById('result');
const downloadLinkDiv = document.getElementById('downloadLink');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/extract', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();

            if (data.results) {
                const resultsHtml = Object.keys(data.results).map((contract) => {
                    const contractData = data.results[contract];
                    return `
                        <h2>${contract}</h2>
                        <ul>
                            <li>Termination and Amendment Terms: ${contractData.termination_and_amendment_terms}</li>
                            <li>Obligations and Deliverables: ${contractData.obligations_and_deliverables}</li>
                            <li>Key Dates and Deadlines: ${contractData.key_dates_and_deadlines}</li>
                            <li>Payment and Fee Structures: ${contractData.payment_and_fee_structures}</li>
                            <li>Party Information: ${contractData.party_information}</li>
                            <li>Type of Contract: ${contractData.type_of_contract}</li>
                            <li>Jurisdiction and Governing Laws: ${contractData.jurisdiction_and_governing_laws}</li>
                            <li>Confidentiality and Non-Disclosure: ${contractData.confidentiality_and_non_disclosure}</li>
                        </ul>
                    `;
                }).join('');

                resultDiv.innerHTML = resultsHtml;
                downloadLinkDiv.style.display = 'block';
            } else {
                resultDiv.innerHTML = 'Error: ' + data.message;
            }
        } else {
            resultDiv.innerHTML = 'Error: ' + response.statusText;
        }
    } catch (error) {
        resultDiv.innerHTML = 'Error: ' + error.message;
    }
});
