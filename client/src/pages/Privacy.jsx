// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: App.jsx route renders this page (Privacy). Values usually come from AuthContext, route params, local state, and api/client.js calls; processed state is shown through components and user actions are sent back to backend APIs.

import { Link } from "react-router-dom";
import MarketingShell from "../components/MarketingShell.jsx";

export default function Privacy() {
  return (
    <MarketingShell backTo="/" backLabel="Home">
      <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p>Last updated: June 2026</p>
        <p>
          NoteGenie collects your email, name, and study materials you upload to generate notes,
          flashcards, and quizzes. We use Google Gemini to process content; API keys are stored encrypted.
        </p>
        <h2>Data we store</h2>
        <ul>
          <li>Account info (email, password hash, profile)</li>
          <li>Generated notes, flashcards, quiz attempts, tutor chat history</li>
          <li>Usage metrics for billing and admin cost tracking</li>
          <li>Payment records processed by Razorpay (we do not store card numbers)</li>
        </ul>
        <h2>Third parties</h2>
        <p>
          We use MongoDB Atlas, Firebase Hosting, Render, Google Gemini, and Razorpay for payments.
          Each has their own privacy policy.
        </p>
        <h2>Your rights</h2>
        <p>You can delete your account from Profile settings. Contact support to request a data export.</p>
        <p className="not-prose mt-8">
          <Link to="/terms" className="text-accent-600 underline dark:text-accent-400">
            Terms of Service
          </Link>
        </p>
      </article>
    </MarketingShell>
  );
}

