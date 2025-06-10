// scripts.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const form = document.getElementById('uploadForm');
    const resultDiv = document.getElementById('result');
    const downloadLinkDiv = document.getElementById('downloadLink');
    const fileInput = document.getElementById('fileInput');
    const fileDropArea = document.getElementById('fileDropArea');
    const fileDropText = document.getElementById('fileDropText');
    const fileNameDisplay = document.getElementById('fileName');
    const browseButton = document.getElementById('browseButton');
    const submitButton = document.getElementById('submitButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');

    // --- State ---
    let selectedFile = null;

    // --- Functions ---

    /**
     * Updates the UI to show the name of the selected file.
     * @param {File} file The file selected by the user.
     */
    const updateFileName = (file) => {
        if (file) {
            selectedFile = file;
            fileDropText.textContent = 'File selected:';
            fileNameDisplay.textContent = file.name;
            submitButton.disabled = false;
        } else {
            selectedFile = null;
            fileDropText.textContent = 'Drag and drop your contract here';
            fileNameDisplay.textContent = '';
            submitButton.disabled = true;
        }
    };

    /**
     * Toggles the UI into a loading state during form submission.
     * @param {boolean} isLoading True to show loading state, false to hide it.
     */
    const setLoadingState = (isLoading) => {
        if (isLoading) {
            buttonText.textContent = 'Extracting...';
            spinner.classList.remove('hidden');
            submitButton.disabled = true;
        } else {
            buttonText.textContent = 'Extract Information';
            spinner.classList.add('hidden');
            submitButton.disabled = false;
        }
    };
    
    /**
     * Renders the error message in the result div.
     * @param {string} message The error message to display.
     */
    const renderError = (message) => {
        resultDiv.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                <strong class="font-bold">Error:</strong>
                <span class="block sm:inline">${message}</span>
            </div>
        `;
    };

    /**
     * Converts a string from snake_case to Title Case.
     * @param {string} str The input string in snake_case.
     * @returns {string} The formatted string in Title Case.
     */
    const toTitleCase = (str) => {
        return str
            .replace(/_/g, ' ')
            .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    };

    /**
     * Renders the extracted contract data into a visually appealing card format.
     * @param {object} data The extracted data from the server.
     */
    const renderResults = (data) => {
        // Clear previous results or errors
        resultDiv.innerHTML = '';
        
        if (data.results) {
            const resultsHtml = Object.keys(data.results).map((contract) => {
                const contractData = data.results[contract];
                const detailsHtml = Object.keys(contractData).map(key => `
                    <div class="result-item">
                        <dt class="result-item-key">${toTitleCase(key)}</dt>
                        <dd class="result-item-value">${contractData[key] || 'N/A'}</dd>
                    </div>
                `).join('');

                return `
                    <div class="result-card bg-white shadow-md rounded-lg overflow-hidden mb-6">
                        <div class="p-4 bg-slate-100 border-b border-slate-200">
                            <h2 class="text-xl font-semibold text-slate-800">${toTitleCase(contract.replace(/_/g, ' '))}</h2>
                        </div>
                        <dl class="p-4 sm:p-6">
                            ${detailsHtml}
                        </dl>
                    </div>
                `;
            }).join('');

            resultDiv.innerHTML = resultsHtml;
            downloadLinkDiv.style.display = 'block'; // Or use classList for transitions
        } else {
            renderError(data.message || 'An unknown error occurred.');
        }
    };

    // --- Event Listeners ---

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            renderError('Please select a file before extracting.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        setLoadingState(true);
        resultDiv.innerHTML = ''; // Clear old results
        downloadLinkDiv.style.display = 'none';

        try {
            const response = await fetch('/extract', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                renderResults(data);
            } else {
                renderError(data.message || response.statusText);
            }
        } catch (error) {
            renderError(error.message);
        } finally {
            setLoadingState(false);
        }
    });

    // Handle clicking the "browse" button to trigger the hidden file input
    browseButton.addEventListener('click', () => {
        fileInput.click();
    });

    // Update UI when a file is selected via the browse dialog
    fileInput.addEventListener('change', () => {
        updateFileName(fileInput.files[0]);
    });

    // --- Drag and Drop Event Handlers ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => {
            fileDropArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => {
            fileDropArea.classList.remove('drag-over');
        }, false);
    });

    fileDropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files; // Important: assign files to the input
            updateFileName(files[0]);
        }
    }, false);

    // Initial state setup
    submitButton.disabled = true;
});