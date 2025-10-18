//In this js file, swal is a keyword in sweetalert.js used instead of alert keyword.

//------------------------importing image from localStorage or RealTime Database-------------------------//
let currentUser;
let keepLoggedIn = localStorage.getItem("keepLoggedIn");
let proceedFromHomeButtonOnly = sessionStorage.getItem("proceedFromHomeButtonOnly")
let payFromFacePageOnly = sessionStorage.getItem('payFromFacePageOnly');
let referencedImageURL;

function getUserName() {
  if (keepLoggedIn == "yes") {
      currentUser = JSON.parse(localStorage.getItem('user'));
  } else {
      currentUser = JSON.parse(sessionStorage.getItem('user'));
  }
}
getUserName();
if (currentUser) {
  referencedImageURL = currentUser.profileImgURL;
  if (proceedFromHomeButtonOnly == "false") {
    swal("Before starting face verification, fill transaction details at home page.", "Pressing 'OK' will redirect you to home.", "warning", {timer: 4000}).then(function() {
      window.location.href = "../index.html"
    })
  }
}
else {
  swal("Login First!", "To start face verification, Please Log In!\n\nPressing 'OK' will redirect you to log in.", "warning", {timer: 4000}).then(function(reply) {
    if (reply) window.location.href = "./login.html"
    else window.location.href = "../index.html"
  })
}



//--------------------------------------Declaration of Variables-----------------------------------------//
const message = document.getElementById('message');
const video = document.getElementById('videoElement');
const main = document.getElementById('main');
const startBtn = document.getElementById('start-btn');

const modelsSrc = "../models";

let faceMatcher;
let canvas;
let showStartBtn = true;
let showCanvas = true;
let faceLabel;
let faceScore;
let faceVerified;


// helper function for HTML file (face-verification.html)
const clickLogoImg = () => {
  window.location.href = '../index.html';
}

const clickStartBtn = () => {
  startFaceRecognition();
}



//-----------------------------------------face-verification--------------------------------------------//
message.innerText = "Starting Camera..."

// Loading Models
Promise.all([
  //faceapi.nets.tinyFaceDetector.loadFromUri(modelsSrc), // This is lighter and faster but little less accurate
  faceapi.nets.ssdMobilenetv1.loadFromUri(modelsSrc), // This is heavier and slower but more accurate
  faceapi.nets.faceLandmark68Net.loadFromUri(modelsSrc),
  faceapi.nets.faceRecognitionNet.loadFromUri(modelsSrc),
]).then(startVideo)


// Getting Camera

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  );
  // Calling Face Matching Function
  matchFace();
}


// Add this helper function to load base64 images properly
function createImageFromBase64(base64String) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64String;
  });
}

// Labeling the refrence image from Database and generating the face descriptor to match further

function loadAndLabelImagesFromDB() {
  const labels = ['known']
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = []
      message.innerText = `Processing Data...`
      const imgURL = referencedImageURL
      
      // if the user has not uploaded the profile picture
      if (!imgURL || imgURL == "null") {
        swal("Update Profile!", "To start face verification, Please upload the profile picture first in the profile section.", "warning").then(function(reply) {
          if (reply) window.location.href = "./profile.html"
          else message.innerText = "Please update your profile picture!"
        });
        return null;
      }
      
      try {
        // For base64 images, create an HTML image element
        const img = await createImageFromBase64(imgURL);
        
        // detect the face with the highest score in the image and compute its landmarks and face descriptor
        const detections = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (detections) {
          // storing the generated descriptor into an array called descriptions
          descriptions.push(detections.descriptor);
          
          // returning the label and descriptions 
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        } else {
          message.innerText = "No face detected in profile image!";
          swal("No face detected", "Please upload a clear picture showing your face in the profile section.", "warning");
          return null;
        }
      } catch (error) {
        console.error("Error processing profile image:", error);
        message.innerText = "Error processing profile image!";
        return null;
      }
    })
  ).then(results => results.filter(result => result !== null)); // Filter out null results
}


// Face Matching Function

async function matchFace() {
  try {
    // calling loadAndLabelImagesFromDB function to feed it into FaceMatcher of faceapi.js
    const labeledFaceDescriptors = await loadAndLabelImagesFromDB();
    
    if (!labeledFaceDescriptors || labeledFaceDescriptors.length === 0) {
      message.innerText = "Could not process profile image. Please update your profile picture.";
      return;
    }
    
    // using FaceMatcher API with 60% score which depicts the maximum descriptor distance
    faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

    message.innerText = "Data Processed! Camera Started!";
    setTimeout(() => {
      message.innerText = "To begin! Press 'Start Verification' below.";
      if (showStartBtn) startBtn.classList.replace('hide', 'unhide');
      else swal("Something went wrong!", "Please refresh the page.", "error").then(function(reply) {
        if(reply) window.location.reload();
      });
    }, 1000);
  } catch (error) {
    console.error("Error in face matching setup:", error);
    message.innerText = "Error setting up face verification. Please try again.";
    swal("Error", "Could not set up face verification. Please try again or update your profile picture.", "error");
  }
}


// last and final face-recognition function which will be showing the result

async function startFaceRecognition() {
    // removing canvas to prevent overlapping with previous canvas
    if (canvas) canvas.remove();
    
    // creating canvas for displaying on webPage
    canvas = faceapi.createCanvasFromMedia(video);
    main.appendChild(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    
    try {
      // Replace faceapi.TinyFaceDetectorOptions() with faceapi.SsdMobilenetv1Options() if using heavier version
      const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

      if (!resizedDetections || !resizedDetections[0]) {
        message.innerText = "No face detected in camera. Please try again.";
        swal("Face not detected!", "Please ensure good lighting and position your face clearly in the frame.", "warning");
        return;
      }

      const descriptorResult = resizedDetections[0].descriptor;
      const result = faceMatcher.findBestMatch(descriptorResult);

      faceLabel = result._label;
      faceScore = result._distance;

      // if face is detected then display result
      if (descriptorResult && showCanvas) {
        const box = resizedDetections[0].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box);
        drawBox.draw(canvas);
      }

      // ready for payment :)
      makePayment();
    } catch (error) {
      console.error("Error during face recognition:", error);
      message.innerText = "Error during face verification. Please try again.";
      swal("Error", "Something went wrong during face verification. Please try again.", "error");
    }
}



//-----------------------------------------Forwarding for payment response--------------------------------------------//
function makePayment() {
  payFromFacePageOnly = true;
  if (faceLabel == "known" && faceScore <= 0.45) {
    faceVerified = true;
    swal(`${currentUser.fullname}, you are now verified!`, "Press the pay button to make payment.", "success")
    message.innerText = "Press the 'Pay' button to make payment."
    startBtn.innerText = "Pay"
    startBtn.classList.add('pay-btn')
    startBtn.onclick = () => window.location.replace("./payment.html")
  }

  else if (faceLabel == "known" && faceScore > 0.45) {
    faceVerified = false;
    message.innerText = `Try again! we want to be more sure that it's ${currentUser.fullname}.`
  }
  
  else {
    faceVerified = false;
    swal("Verification Failed!", "Face was not matched with the profile", "error").then(function() {
      window.location.replace('./payment.html')
    }) 
  }

  sessionStorage.setItem('payFromFacePageOnly', payFromFacePageOnly);
  sessionStorage.setItem('faceVerified', faceVerified);
}