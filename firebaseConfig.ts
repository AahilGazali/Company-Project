// firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCIErEGV2mkkxPoZDzMSMDuZtlzaFqzyxA",
  authDomain: "company-project-4f00b.firebaseapp.com",
  projectId: "company-project-4f00b",
  storageBucket: "company-project-4f00b.appspot.com",
  messagingSenderId: "559223393664",
  appId: "1:559223393664:web:641163a4ba1454e41c8565",
  measurementId: "G-99G6CVBSG6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
