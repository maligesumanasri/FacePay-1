//In this js file, swal is a keyword in sweetalert.js used instead of alert keyword.

//reseting the browser storage value
let proceedFromHomeButtonOnly = false;
sessionStorage.setItem('proceedFromHomeButtonOnly', proceedFromHomeButtonOnly);

let faceVerified = false;
sessionStorage.setItem('faceVerified', faceVerified);

let payFromFacePageOnly = false;
sessionStorage.setItem('payFromFacePageOnly', payFromFacePageOnly);

// helper functions for html
const clickSaveBtn = () => {
    window.location.href = '../index.html';
};
  
const clickLogoImg = () => {
    window.location.href = '../index.html';
};

document.getElementById('logo').addEventListener('click', clickLogoImg);
document.getElementById('save-btn').addEventListener('click', clickSaveBtn);


//-----------------------------------------script for css of profile-img-box--------------------------------------------//
const imgContainer = document.querySelector('.photo-container');
const img = document.querySelector('#photo');
const file = document.querySelector('#file');
const uploadBtn = document.querySelector('#uploadBtn');

//if user hover on imgContainer 
imgContainer.addEventListener('mouseenter', function() {
    uploadBtn.style.display = "block";
});

//if we hover out from imgContainer
imgContainer.addEventListener('mouseleave', function() {
    uploadBtn.style.display = "none";
});


let currentUser = null;
let keepLoggedIn = localStorage.getItem("keepLoggedIn");
//------------------------------fetching data from localStorage to show on profile-------------------------//
function getUserName() {
    if (keepLoggedIn == "yes") {
        currentUser = JSON.parse(localStorage.getItem('user'));
    } else {
        currentUser = JSON.parse(sessionStorage.getItem('user'));
    }
}

getUserName();

// Initialize emailString variable
let emailString = "";

if (currentUser) {
    let name = currentUser.fullname;
    let email = currentUser.email;
    let username = currentUser.username;
    let phone = currentUser.phone;
    let payid = phone + "@facepay";
    
    // Create sanitized email string for Firebase path
    emailString = email.replaceAll('.', '')
                       .replaceAll('#', '')
                       .replaceAll('$', '')
                       .replaceAll('[', '')
                       .replaceAll(']', '');
    
    document.getElementById('name').innerText = name;
    document.getElementById('email').innerText = email;
    document.getElementById('username').innerText = username;
    document.getElementById('phone').innerText = phone;
    document.getElementById('payid').innerText = payid;
} else {
    swal("Login First!", "To view profile, Please Log In!\n\nPressing 'OK' will redirect you to log in.", "warning").then(function(reply) {
        if (reply) window.location.href = "./login.html"
        else window.location.href = "../index.html"
    })
}


//-----------------------------------------Firebase--------------------------------------------//
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnEAVg__QSMgu9COS-UWx9_oJDE2bzMRA",
    authDomain: "today-5d084.firebaseapp.com",
    databaseURL: "https://today-5d084-default-rtdb.firebaseio.com",
    projectId: "today-5d084",
    storageBucket: "today-5d084.firebasestorage.app",
    messagingSenderId: "67885556598",
    appId: "1:67885556598:web:c4d69673d9e50bd5e0d057",
    measurementId: "G-DVDGZEF2VC"
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Realtime Database
import { getDatabase, ref, get, child, set, update } from "https://www.gstatic.com/firebasejs/9.8.1/firebase-database.js";

const realdb = getDatabase();


//-----------------------------------------selection of img from pc--------------------------------------------//
//when we choose an image to upload
let chosenImageToUpload = null;

file.addEventListener('change', function() {
    const imageChosen = this.files[0];
    chosenImageToUpload = imageChosen;
    if (imageChosen) {
        const reader = new FileReader(); //FileReader is a predefined function of JS
        reader.addEventListener('load', function() {
            img.setAttribute('src', reader.result);
        });
        reader.readAsDataURL(imageChosen);
        uploadProcess();
    }
});


//-----------------------------------------Uploading Files (Image)--------------------------------------------//
const uploadProcess = () => {
    const uploadMessage = document.getElementById('upload-text');
    
    // Show upload in progress message
    uploadMessage.classList.replace('hide', 'unhide');
    uploadMessage.innerHTML = "* * Processing Image * *";
    document.getElementById('save-btn').classList.replace('unhide', 'hide');
    
    // Convert image file to base64 string
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const imageData = event.target.result; // base64 encoded string
        
        // Store image in localStorage or sessionStorage based on user preference
        setImageToStorage(imageData);
        
        // Update UI
        uploadMessage.classList.replace('unhide', 'hide');
        document.getElementById('save-btn').classList.replace('hide', 'unhide');
        swal("Photo uploaded successfully!", "", "success");
    };
    
    reader.onerror = function() {
        swal("Image processing failed!", "Please try again with a different image.", "error");
        uploadMessage.classList.replace('unhide', 'hide');
        document.getElementById('save-btn').classList.replace('unhide', 'hide');
    };
    
    reader.readAsDataURL(chosenImageToUpload);
};

// New function to store image data
function setImageToStorage(imageData) {
    // Add image data to current user object
    currentUser.profileImgURL = imageData;
    
    // Store based on user preference
    if (keepLoggedIn == "yes") {
        localStorage.setItem('user', JSON.stringify(currentUser));
    } else {
        sessionStorage.setItem('user', JSON.stringify(currentUser));
    }
    
    // If you still want to use the Realtime DB as backup
    setURLtoRealDB(imageData);
}

//-----------------------------------------Setting Image URL to Firebase Realtime Database--------------------------------------------//
const setURLtoRealDB = (URL) => {
    update(ref(realdb, "UsersList/" + emailString), {
        profileImgURL: URL
    })
}


//We can fetch user profile img either from local storage or from firebase realtime database but fetching from local storage would be faster--------------------------------------------//
//-----------------------------------------Getting Image URL from Local/Session Storage to show on profile--------------------------------------------//
function getImgFromLocalStorage() {
    if (currentUser.profileImgURL && currentUser.profileImgURL !== "null") {
        img.setAttribute('src', currentUser.profileImgURL);
    } else {
        img.setAttribute('src', "../images/profileM.jpg");
    }
}
getImgFromLocalStorage();


//-----------------------------------------Getting Image URL from Firebase Realtime Database--------------------------------------------//
const dbRef = ref(realdb);
const getURLfromRealDB = () => {
    get(child(dbRef, "UsersList/" + emailString)).then((user) => {
        if (user.exists()) {
            img.setAttribute('src', user.val().profileImgURL);
        }
    })
}

