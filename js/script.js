// Acne Detection System - AI-powered Analysis
const URL = "https://teachablemachine.withgoogle.com/models/_1tX74qb6/";

let model, webcam, labelContainer, maxPredictions;
let isInitialized = false;
let isWebcamActive = false;
let uploadedImage = null;

// Handle camera analysis button click
function handleStartClick() {
    // Hide any uploaded image and restore placeholder
    const imageContainer = document.getElementById('image-container');
    imageContainer.style.display = 'none';
    const webcamContainer = document.getElementById('webcam-container');
    webcamContainer.style.display = 'flex';
    
    // Initialize or resume webcam
    if (!isInitialized) {
        const startButton = document.querySelector('.start-button');
        startButton.disabled = true;
        startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
        document.querySelector('.loader-container').classList.add('active');
        init();
    } else if (!isWebcamActive && webcam) {
        // Resume webcam if it was paused
        resumeWebcam();
    }
}

// Handle dermatological image upload
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.match('image.*')) {
        showNotification('Please select a valid dermatological image', 'error');
        return;
    }
    
    // Show loader while processing
    document.querySelector('.loader-container').classList.add('active');
    
    // Stop webcam if active
    if (isWebcamActive && webcam) {
        pauseWebcam();
    }
    
    // Display image container, hide webcam container
    const webcamContainer = document.getElementById('webcam-container');
    webcamContainer.style.display = 'none';
    const imageContainer = document.getElementById('image-container');
    imageContainer.style.display = 'flex';
    imageContainer.innerHTML = '';
    
    // Create image element
    const img = document.createElement('img');
    img.onload = async function() {
        // Initialize model if needed
        if (!isInitialized) {
            const success = await initModelOnly();
            if (!success) return;
        }
        
        // Analyze the dermatological image
        await predictOnImage(img);
        
        // Hide loader when done
        document.querySelector('.loader-container').classList.remove('active');
        showNotification('Dermatological analysis complete', 'success');
    };
    
    // Set image source from file
    const reader = new FileReader();
    reader.onload = (e) => {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Store the image and add to container
    uploadedImage = img;
    imageContainer.appendChild(img);
    
    // Reset file input for future uploads
    event.target.value = '';
}

// Initialize diagnostic model (for uploaded images)
async function initModelOnly() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Load the model and metadata
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        
        // Setup assessment container with animation
        setupLabelContainer();
        
        isInitialized = true;
        return true;
    } catch (error) {
        console.error("Error initializing diagnostic model:", error);
        document.querySelector('.loader-container').classList.remove('active');
        showNotification("Error initializing diagnostic system. Please try again.", "error");
        return false;
    }
}

// Initialize the diagnostic model and clinical imaging system
async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Show progress notifications
        showNotification("Loading diagnostic model...", "info");
        
        // Load the model and metadata
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        showNotification("Initializing camera...", "info");
        
        // Setup clinical imaging system (webcam)
        const flip = true; // whether to flip the webcam
        webcam = new tmImage.Webcam(500, 375, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        window.requestAnimationFrame(loop);

        // append elements to the DOM
        const webcamContainer = document.getElementById("webcam-container");
        webcamContainer.innerHTML = '';
        webcamContainer.appendChild(webcam.canvas);
        webcamContainer.style.display = 'flex';
        
        // Make sure image container is hidden
        document.getElementById('image-container').style.display = 'none';

        // Setup assessment container
        setupLabelContainer();
        
        isWebcamActive = true;
        isInitialized = true;
        
        // Hide loader and update UI
        document.querySelector('.loader-container').classList.remove('active');
        document.querySelector('.start-button').disabled = false;
        document.querySelector('.start-button').innerHTML = '<i class="fas fa-camera"></i> Analysis Active';
        
        showNotification("Diagnostic system ready", "success");
    } catch (error) {
        console.error("Error initializing diagnostic system:", error);
        document.querySelector('.loader-container').classList.remove('active');
        document.querySelector('.start-button').disabled = false;
        document.querySelector('.start-button').innerHTML = '<i class="fas fa-camera"></i> Analyze with Camera';
        showNotification("Initialization error. Please check camera permissions and try again.", "error");
    }
}

// Setup the diagnostic assessment container
function setupLabelContainer() {
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = '';
    
    // Create assessment bars for each acne classification
    for (let i = 0; i < maxPredictions; i++) {
        const predictionDiv = document.createElement("div");
        predictionDiv.classList.add('prediction-bar', 'fade-in');
        predictionDiv.style.animationDelay = `${i * 0.1}s`;
        
        const labelDiv = document.createElement("div");
        labelDiv.classList.add('prediction-label');
        
        const valueDiv = document.createElement("div");
        valueDiv.classList.add('prediction-value');
        valueDiv.textContent = '0%';
        
        const fillDiv = document.createElement("div");
        fillDiv.classList.add('prediction-fill');
        fillDiv.style.width = "0%";
        
        predictionDiv.appendChild(labelDiv);
        predictionDiv.appendChild(valueDiv);
        predictionDiv.appendChild(fillDiv);
        labelContainer.appendChild(predictionDiv);
    }
}

// Pause the webcam
function pauseWebcam() {
    if (webcam) {
        webcam.pause();
        isWebcamActive = false;
    }
}

// Resume the webcam
function resumeWebcam() {
    if (webcam) {
        webcam.play();
        isWebcamActive = true;
        document.getElementById('webcam-container').classList.add('active');
        window.requestAnimationFrame(loop);
    }
}

// Main loop for webcam prediction
async function loop() {
    if (webcam && isWebcamActive) {
        webcam.update(); // update the webcam frame
        await predict(webcam.canvas);
        window.requestAnimationFrame(loop);
    }
}

// Analyze dermatological image
async function predictOnImage(imageElement) {
    if (!model) return;
    try {
        await predict(imageElement);
    } catch (error) {
        console.error("Error during dermatological analysis:", error);
        showNotification("Analysis error. Please try with a clearer image.", "error");
    }
}

// Perform dermatological analysis on input element (webcam or image)
async function predict(inputElement) {
    try {
        // Perform AI analysis on the input
        const prediction = await model.predict(inputElement);
        
        // Sort predictions by probability (highest first)
        const sortedPredictions = [...prediction].sort((a, b) => b.probability - a.probability);
        
        // Update assessment bars with animation
        for (let i = 0; i < maxPredictions; i++) {
            const predictionBar = labelContainer.childNodes[i];
            const label = predictionBar.querySelector(".prediction-label");
            const value = predictionBar.querySelector(".prediction-value");
            const fill = predictionBar.querySelector(".prediction-fill");
            
            // Set label and value text
            const percentage = Math.round(sortedPredictions[i].probability * 100);
            const acneType = getClinicalTerminology(sortedPredictions[i].className, percentage);
            label.textContent = acneType;
            value.textContent = `${percentage}%`;
            
            // Update fill width with animation
            setTimeout(() => {
                fill.style.width = `${percentage}%`;
                
                // Style based on confidence level
                if (i === 0 && percentage > 80) {
                    // High confidence primary diagnosis
                    fill.style.backgroundColor = 'var(--accent-color)';
                } else if (i === 0) {
                    // Primary diagnosis with moderate confidence
                    fill.style.backgroundColor = 'var(--primary-color)';
                } else {
                    // Differential diagnoses
                    fill.style.backgroundColor = 'var(--primary-color)';
                    fill.style.opacity = 0.65 - (i * 0.15);
                }
            }, 100 * i); // Stagger animations
        }
        
        // Show treatment recommendations for the highest probability acne type
        if (sortedPredictions[0].probability > 0.5) { // Only show if confidence is reasonable
            const primaryAcneType = sortedPredictions[0].className;
            const confidence = Math.round(sortedPredictions[0].probability * 100);
            showTreatmentRecommendations(primaryAcneType, confidence);
        }
    } catch (error) {
        console.error("Error during dermatological analysis:", error);
        showNotification("Analysis error occurred", "error");
    }
}

// Get clinical terminology for acne classification
function getClinicalTerminology(className, confidence) {
    // This would be extended with actual acne types from your model
    const acneTypeMap = {
        'acne': 'Acne Vulgaris',
        'mild_acne': 'Mild Acne',
        'moderate_acne': 'Moderate Inflammatory Acne',
        'severe_acne': 'Severe Nodular Acne',
        'cystic_acne': 'Cystic Acne',
        'comedonal_acne': 'Comedonal Acne',
        'pustular_acne': 'Pustular Acne',
        'papular_acne': 'Papular Acne',
        'hormonal_acne': 'Hormonal Acne',
        'no_acne': 'No Acne Detected',
        'normal_skin': 'Normal Skin',
        'whitehead': 'Comedonal Acne (Closed)',
        'blackhead': 'Comedonal Acne (Open)',
        'pustules': 'Pustular Acne'
    };
    
    // Convert to lowercase for matching
    const lcName = className.toLowerCase();
    
    // Return mapped name or original with formatting
    return acneTypeMap[lcName] || 
        (lcName.includes('acne') ? 
            lcName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 
            className);
}

// Format acne type for clinical presentation (legacy function kept for compatibility)
function formatAcneType(className) {
    return getClinicalTerminology(className, 0);
}

// Show notification message
function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`, 'fade-in');
    
    // Add icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'info':
        default:
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    notification.innerHTML = `${icon} ${message}`;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Display treatment recommendations based on acne type
function showTreatmentRecommendations(acneType, confidence) {
    const treatmentContainer = document.getElementById('treatment-container');
    const treatmentContent = document.getElementById('treatment-content');
    
    // Clear previous content
    treatmentContent.innerHTML = '';
    
    // Get recommendations for the detected acne type
    const recommendations = getTreatmentRecommendations(acneType);
    
    // Add recommendations to the container
    recommendations.forEach(rec => {
        const treatmentItem = document.createElement('div');
        treatmentItem.className = 'treatment-item';
        treatmentItem.innerHTML = `
            <i class="fas ${rec.icon}"></i>
            <div class="treatment-item-content">
                <div class="treatment-item-title">${rec.title}</div>
                <div class="treatment-item-description">${rec.description}</div>
            </div>
        `;
        treatmentContent.appendChild(treatmentItem);
    });
    
    // Show the container
    treatmentContainer.style.display = 'block';
}

// Get treatment recommendations based on acne type
function getTreatmentRecommendations(acneType) {
    // Default recommendations that apply to most acne types
    const defaultRecommendations = [
        {
            title: "Gentle Cleansing",
            description: "Wash affected areas twice daily with a mild, non-abrasive cleanser to remove excess oil and dirt.",
            icon: "fa-soap"
        },
        {
            title: "Avoid Touching",
            description: "Refrain from touching, picking, or popping acne lesions to prevent scarring and infection.",
            icon: "fa-hand-paper"
        },
        {
            title: "Healthy Diet",
            description: "Maintain a balanced diet rich in fruits, vegetables, and whole grains while limiting high-glycemic foods.",
            icon: "fa-apple-alt"
        }
    ];
    
    // Specific recommendations based on acne type
    let specificRecommendations = [];
    
    switch(acneType.toLowerCase()) {
        case "papules":
        case "inflammatory":
            specificRecommendations = [
                {
                    title: "Anti-inflammatory Products",
                    description: "Use products containing benzoyl peroxide (2.5-5%) to reduce inflammation and kill bacteria.",
                    icon: "fa-prescription-bottle-alt"
                },
                {
                    title: "Avoid Irritants",
                    description: "Stop using oily cosmetics, hair products, and other potential skin irritants.",
                    icon: "fa-allergies"
                }
            ];
            break;
            
        case "blackheads":
        case "comedonal":
        case "comedones":
            specificRecommendations = [
                {
                    title: "Exfoliation",
                    description: "Use products with salicylic acid (1-2%) to exfoliate and unclog pores.",
                    icon: "fa-prescription-bottle-alt"
                },
                {
                    title: "Non-comedogenic Products",
                    description: "Use only non-comedogenic (won't clog pores) skincare and makeup products.",
                    icon: "fa-check-circle"
                }
            ];
            break;
            
        case "cystic":
        case "nodular":
        case "severe":
            specificRecommendations = [
                {
                    title: "Seek Dermatologist Care",
                    description: "Consult a dermatologist for prescription treatments like isotretinoin or antibiotics.",
                    icon: "fa-user-md"
                },
                {
                    title: "Warm Compresses",
                    description: "Apply warm compresses to reduce pain and promote healing of deep lesions.",
                    icon: "fa-thermometer-half"
                }
            ];
            break;
            
        case "pustules":
        case "moderate":
            specificRecommendations = [
                {
                    title: "Spot Treatments",
                    description: "Apply benzoyl peroxide or sulfur-based spot treatments directly to pustules.",
                    icon: "fa-prescription-bottle-alt"
                },
                {
                    title: "Consistent Routine",
                    description: "Maintain a consistent skincare routine with morning and evening cleansing.",
                    icon: "fa-calendar-check"
                }
            ];
            break;
            
        default:
            specificRecommendations = [
                {
                    title: "Gentle Products",
                    description: "Use gentle, fragrance-free skincare products designed for sensitive skin.",
                    icon: "fa-feather-alt"
                },
                {
                    title: "Consult Professional",
                    description: "For persistent acne, consult a dermatologist for personalized treatment options.",
                    icon: "fa-user-md"
                }
            ];
    }
    
    // Combine specific and default recommendations
    return [...specificRecommendations, ...defaultRecommendations];
}

// Helper function to ensure main content is visible when showing predictions
function ensureMainContentVisible() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollIntoView({ behavior: 'smooth' });
    }
}

// Apply saved theme on page load
document.addEventListener('DOMContentLoaded', () => {
    // The default is dark mode, but we can switch to light mode if saved
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // Hide the image container initially
    document.getElementById('image-container').style.display = 'none';
    
    // Reset file input when page loads
    document.getElementById('imageUpload').value = '';
    
    // Add notification styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 18px;
            border-radius: 6px;
            background-color: var(--secondary-color);
            color: white;
            font-weight: 500;
            font-size: 0.85rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        
        .notification i {
            font-size: 0.9rem;
        }
        
        .notification-success {
            background-color: rgba(16, 185, 129, 0.95);
        }
        
        .notification-error {
            background-color: rgba(239, 68, 68, 0.95);
        }
        
        .notification-info {
            background-color: rgba(124, 58, 237, 0.95);
        }
        
        .fade-out {
            opacity: 0;
            transform: translate(-50%, 20px);
            transition: all 0.5s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Welcome message
    setTimeout(() => {
        showNotification('AI detection system ready. Begin analysis.', 'info');
    }, 1000);
});
