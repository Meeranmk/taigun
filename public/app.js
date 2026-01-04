// DOM Elements
const problemForm = document.getElementById('problemForm');
const submitBtn = document.getElementById('submitBtn');
const problemSection = document.getElementById('problemSection');
const solutionSection = document.getElementById('solutionSection');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');

// Form submission
problemForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const problem = document.getElementById('problem').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();

    if (!problem) {
        showError('Please describe your problem');
        return;
    }

    // Show loading state
    showLoading();

    try {
        const response = await fetch('/api/submit-problem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                problem,
                userName: userName || undefined,
                userEmail: userEmail || undefined,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate solution');
        }

        // Display solution
        displaySolution(data.solution);
    } catch (error) {
        showError(error.message);
    }
});

// Show loading state
function showLoading() {
    problemSection.style.display = 'none';
    solutionSection.style.display = 'none';
    errorSection.style.display = 'none';
    loadingSection.style.display = 'block';

    // Simulate progress updates
    const statuses = [
        'Analyzing your problem...',
        'Searching knowledge base...',
        'Checking similar cases...',
        'Generating solution...',
    ];

    let index = 0;
    const statusElement = document.getElementById('loadingStatus');

    const interval = setInterval(() => {
        index = (index + 1) % statuses.length;
        statusElement.textContent = statuses[index];
    }, 2000);

    // Store interval ID to clear it later
    window.loadingInterval = interval;
}

// Display solution
function displaySolution(solution) {
    // Clear loading interval
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
    }

    // Hide other sections
    problemSection.style.display = 'none';
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    solutionSection.style.display = 'block';

    // Set confidence badge
    const confidenceBadge = document.getElementById('confidenceBadge');
    const confidence = solution.confidence || 0.5;
    let confidenceClass = 'confidence-low';
    let confidenceText = 'Low Confidence';

    if (confidence >= 0.8) {
        confidenceClass = 'confidence-high';
        confidenceText = 'High Confidence';
    } else if (confidence >= 0.5) {
        confidenceClass = 'confidence-medium';
        confidenceText = 'Medium Confidence';
    }

    confidenceBadge.className = `confidence-badge ${confidenceClass}`;
    confidenceBadge.textContent = `${confidenceText} (${Math.round(confidence * 100)}%)`;

    // Display problem summary
    const problemSummary = document.getElementById('problemSummary');
    problemSummary.innerHTML = `<strong>Your Problem:</strong> ${solution.problem}`;

    // Display solution steps
    const solutionSteps = document.getElementById('solutionSteps');
    solutionSteps.innerHTML = '<h3>📋 Solution Steps</h3>' +
        solution.steps.map(step => `
            <div class="step">
                <div class="step-number">${step.stepNumber}</div>
                <div class="step-content">
                    <span class="step-type step-type-${step.type}">${step.type}</span>
                    <p>${step.description}</p>
                </div>
            </div>
        `).join('');

    // Display similar cases if available
    const similarCases = document.getElementById('similarCases');
    const similarCasesList = document.getElementById('similarCasesList');

    if (solution.similarCases && solution.similarCases.length > 0) {
        similarCases.style.display = 'block';
        similarCasesList.innerHTML = solution.similarCases.map(case_ => `
            <div class="similar-case">
                <div class="case-header">
                    <span class="case-source source-${case_.source}">${case_.source === 'knowledge-base' ? 'Knowledge Base' : 'ServiceNow'
            }</span>
                    <span class="similarity-score">${Math.round(case_.similarity * 100)}% match</span>
                </div>
                <p><strong>Problem:</strong> ${case_.problem}</p>
            </div>
        `).join('');
    } else {
        similarCases.style.display = 'none';
    }

    // Scroll to solution
    solutionSection.scrollIntoView({ behavior: 'smooth' });
}

// Show error
function showError(message) {
    // Clear loading interval
    if (window.loadingInterval) {
        clearInterval(window.loadingInterval);
    }

    problemSection.style.display = 'none';
    solutionSection.style.display = 'none';
    loadingSection.style.display = 'none';
    errorSection.style.display = 'block';

    document.getElementById('errorMessage').textContent = message;
}

// Reset form
function resetForm() {
    problemSection.style.display = 'block';
    solutionSection.style.display = 'none';
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';

    document.getElementById('problemForm').reset();
    document.getElementById('problem').focus();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('problem').focus();
});
