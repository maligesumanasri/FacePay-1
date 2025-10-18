let login = document.getElementById("login");
let signup = document.getElementById("signup");
let profile = document.getElementById('profile');
let profileLogo = document.getElementById('profileLogo');
let walletSwitch = document.getElementById('wallet-switch');
let bankSwitch = document.getElementById('bank-switch');
let wallet = document.getElementById('wallet-transfer-container');
let bank = document.getElementById('bank-transfer-container');

// Add this flag at the top of your file for easy toggling during development
const BYPASS_FACEPAY_VERIFICATION = false; // Set to false for production

//reseting the browser storage value
let proceedFromHomeButtonOnly = false;
sessionStorage.setItem('proceedFromHomeButtonOnly', proceedFromHomeButtonOnly);

let faceVerified = false;
sessionStorage.setItem('faceVerified', faceVerified);

let payFromFacePageOnly = false;
sessionStorage.setItem('payFromFacePageOnly', payFromFacePageOnly);

// Form validation function
function validateForm() {
    let isWalletVisible = wallet.classList.contains('unhide');
    let isValid = true;
    
    // Clear previous error messages
    clearErrorMessages();
    
    if (isWalletVisible) {
        // Validate Wallet Transfer form
        const mobileNumber = document.getElementById('mobile-number').value.trim();
        const facepayId = document.getElementById('facepay-id').value.trim();
        const amount = document.getElementById('wallet-amount').value.trim();
        
        // Mobile number validation - should be 10 digits
        if (!mobileNumber) {
            showError('mobile-number', 'mobile-error', 'Please enter a mobile number');
            isValid = false;
        } else if (!/^[0-9]{10}$/.test(mobileNumber)) {
            showError('mobile-number', 'mobile-error', 'Mobile number should be 10 digits');
            isValid = false;
        }
        
        // FacePay ID validation - should be in format: phone@facepay
        if (!facepayId) {
            showError('facepay-id', 'faceid-error', 'Please enter a FacePay ID');
            isValid = false;
        } else if (!/^\d+@facepay$/.test(facepayId)) {
            showError('facepay-id', 'faceid-error', 'Invalid format. Should be: phone@facepay');
            isValid = false;
        } else if (!facepayId.startsWith(mobileNumber) && mobileNumber) {
            showError('facepay-id', 'faceid-error', 'FacePay ID should match the mobile number');
            isValid = false;
        }
        
        // Amount validation
        if (!amount) {
            showError('wallet-amount', 'wallet-amount-error', 'Please enter an amount');
            isValid = false;
        } else if (!/^\d+(\.\d{1,2})?$/.test(amount) || parseFloat(amount) <= 0) {
            showError('wallet-amount', 'wallet-amount-error', 'Please enter a valid positive amount');
            isValid = false;
        }
    } else {
        // Validate Bank Transfer form
        const beneficiaryName = document.getElementById('beneficiary-name').value.trim();
        const accountNumber = document.getElementById('account-number').value.trim();
        const ifscCode = document.getElementById('ifsc-code').value.trim();
        const amount = document.getElementById('bank-amount').value.trim();
        
        // Beneficiary name validation
        if (!beneficiaryName) {
            showError('beneficiary-name', 'beneficiary-error', 'Please enter beneficiary name');
            isValid = false;
        }
        
        // Account number validation
        if (!accountNumber) {
            showError('account-number', 'account-error', 'Please enter account number');
            isValid = false;
        } else if (!/^\d{9,18}$/.test(accountNumber)) {
            showError('account-number', 'account-error', 'Account number should be 9-18 digits');
            isValid = false;
        }
        
        // IFSC code validation
        if (!ifscCode) {
            showError('ifsc-code', 'ifsc-error', 'Please enter IFSC code');
            isValid = false;
        }
        
        // Amount validation
        if (!amount) {
            showError('bank-amount', 'bank-amount-error', 'Please enter an amount');
            isValid = false;
        } else if (!/^\d+(\.\d{1,2})?$/.test(amount) || parseFloat(amount) <= 0) {
            showError('bank-amount', 'bank-amount-error', 'Please enter a valid positive amount');
            isValid = false;
        }
    }
    
    return isValid;
}

// Modify the validateForm function to be async
async function validateFormWithDbCheck() {
    let isWalletVisible = wallet.classList.contains('unhide');
    let isValid = validateForm(); // Run the basic validation first
    
    // Only proceed with database check if basic validation passes and we're in wallet mode
    if (isValid && isWalletVisible) {
        const facepayId = document.getElementById('facepay-id').value.trim();
        
        if (BYPASS_FACEPAY_VERIFICATION) {
            console.warn('⚠️ BYPASSING FACEPAY ID VERIFICATION - FOR TESTING ONLY ⚠️');
            return true;
        }
        
        // Check if the FacePay ID exists in the database
        const exists = await checkFacepayIdExists(facepayId);
        
        if (!exists) {
            showError('facepay-id', 'faceid-error', 'This FacePay ID does not exist in our system');
            return false;
        }
    }
    
    return isValid;
}

// Helper function to show error messages
function showError(inputId, errorId, message) {
    const inputElement = document.getElementById(inputId);
    const errorElement = document.getElementById(errorId);
    
    inputElement.classList.add('input-error');
    errorElement.textContent = message;
}

// Helper function to clear all error messages
function clearErrorMessages() {
    const errorMessages = document.querySelectorAll('.error-message');
    const inputs = document.querySelectorAll('.box-input');
    
    errorMessages.forEach(element => {
        element.textContent = '';
    });
    
    inputs.forEach(input => {
        input.classList.remove('input-error');
    });
}

// Update this function to check phone number in UsersList instead of users
async function checkFacepayIdExists(facepayId) {
    try {
        // Extract phone number from facepayId (format: phone@facepay)
        const phoneNumber = facepayId.split('@')[0];
        
        if (!phoneNumber) {
            console.error('Could not extract phone number from FacePay ID');
            return false;
        }
        
        console.log('Checking phone number:', phoneNumber);
        
        // Get a reference to the UsersList in your Firebase database
        const usersRef = firebase.database().ref('UsersList');
        
        // Query for users with the given phone number
        const snapshot = await usersRef.orderByChild('phone').equalTo(phoneNumber).once('value');
        
        console.log('Database query result:', snapshot.val());
        
        // If data exists, the phone number is valid
        const exists = snapshot.exists();
        console.log('Does user exist in database?', exists);
        
        return exists;
    } catch (error) {
        console.error('Error checking FacePay ID:', error);
        return false;
    }
}

// Update the clickHomeNextBtn function to use async validation
const clickHomeNextBtn = async () => {
    // Show loading indicator or disable button while checking
    const nextBtn = document.getElementById('home-next-btn');
    const originalText = nextBtn.textContent;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Verifying...';
    
    try {
        const isValid = await validateFormWithDbCheck();
        
        if (isValid) {
            proceedFromHomeButtonOnly = true;
            sessionStorage.setItem('proceedFromHomeButtonOnly', proceedFromHomeButtonOnly);
            window.location.href = './src/face-verification.html';
        } else {
            // Reset button state if validation fails
            nextBtn.disabled = false;
            nextBtn.textContent = originalText;
        }
    } catch (error) {
        console.error('Validation error:', error);
        showError('facepay-id', 'faceid-error', 'Error verifying FacePay ID. Please try again.');
        
        // Reset button state on error
        nextBtn.disabled = false;
        nextBtn.textContent = originalText;
    }
}

const clickLogoImg = () => {
    window.location.href = './index.html';
}
 
login.onclick = () => {
    window.location.href = './src/login.html';
}

signup.onclick = () => {
    window.location.href = './src/signup.html';
}

profile.onclick = () => {
    window.location.href = './src/profile.html';
}

// switching of wallet and bank section
walletSwitch.onclick = () => {
    wallet.classList.replace('hide', 'unhide');
    bank.classList.replace('unhide', 'hide');
}

bankSwitch.onclick = () => {
    wallet.classList.replace('unhide', 'hide');
    bank.classList.replace('hide', 'unhide');
}

// setting the profile picture based on user login or not
let currentUser = null;
let keepLoggedIn = localStorage.getItem("keepLoggedIn"); 
function getUserName() {
    if (keepLoggedIn == "yes") {
        currentUser = JSON.parse(localStorage.getItem('user'));
    } else {
        currentUser = JSON.parse(sessionStorage.getItem('user'));
    }
}
getUserName();
if (currentUser.profileImgURL != "null") {
    let photoURL = currentUser.profileImgURL;
    profileLogo.setAttribute('src', photoURL);
} else {
    profileLogo.setAttribute('src', "./images/profileM.jpg");
}

// Add real-time validation on input
document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase is initialized
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not found. Make sure it is properly loaded.');
    }
    
    // Existing code...
    const inputFields = document.querySelectorAll('.box-input');
    inputFields.forEach(field => {
        field.addEventListener('input', function() {
            // Clear error for this field when user starts typing again
            this.classList.remove('input-error');
            const errorId = this.id + '-error';
            const errorElement = document.getElementById(errorId.replace('facepay-id', 'faceid')
                                                         .replace('wallet-amount', 'wallet-amount')
                                                         .replace('bank-amount', 'bank-amount')
                                                         .replace('beneficiary-name', 'beneficiary')
                                                         .replace('account-number', 'account')
                                                         .replace('mobile-number', 'mobile')
                                                         .replace('ifsc-code', 'ifsc'));
            if (errorElement) {
                errorElement.textContent = '';
            }
        });
    });
});
