import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Check,
  RotateCcw,
  Sparkles,
  Calendar,
  Building,
  Heart,
  FileCheck,
  Send
} from 'lucide-react';
import questionsData from '../data/questions.json';
import { BRAND } from '../config/brand';
import Button from '../components/common/Button';
import SeoHead from '../components/common/SeoHead';
import ProgressBar from '../components/designer/ProgressBar';
import QuestionCard from '../components/designer/QuestionCard';
import SummaryPanel from '../components/designer/SummaryPanel';
import { generateConceptNarrative } from '../components/designer/MoodGenerator';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getPriceEstimate, submitGiftRequest, getPdfUrl } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useRealm } from '../context/RealmContext';

const STORAGE_KEY = 'shvom_gift_designer_blueprint_v1';

export default function Designer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mode } = useRealm();

  // Local storage state
  const [persistedData, setPersistedData] = useLocalStorage(STORAGE_KEY, {
    answers: {},
    currentStepIndex: 0
  });

  const [answers, setAnswers] = useState(persistedData.answers || {});
  const [currentStepIndex, setCurrentStepIndex] = useState(persistedData.currentStepIndex || 0);
  const [stepError, setStepError] = useState(null);

  // Pricing estimate state
  const [estimate, setEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Final submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedProposal, setSubmittedProposal] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  // Read URL params on first mount if fresh
  useEffect(() => {
    const occParam = searchParams.get('occasion');
    if (occParam && (!answers.occasion || answers.occasion !== occParam)) {
      setAnswers((prev) => ({ ...prev, occasion: occParam }));
    }
  }, [searchParams]);

  // Persist to local storage
  useEffect(() => {
    setPersistedData({
      answers,
      currentStepIndex
    });
  }, [answers, currentStepIndex, setPersistedData]);

  // Compute active question list based on conditional logic
  const activeQuestions = useMemo(() => {
    return questionsData.questions.filter((q) => {
      if (!q.condition) return true;
      const { field, equals, notEquals } = q.condition;
      if (notEquals !== undefined) {
        return answers[field] !== notEquals;
      }
      return answers[field] === equals;
    });
  }, [answers]);

  const currentQuestion = activeQuestions[currentStepIndex] || activeQuestions[0];
  const totalSteps = activeQuestions.length;

  // Step Titles for Progress Bar
  const stepTitles = activeQuestions.map((q) => q.title.split(' ')[0] + ' ' + (q.title.split(' ')[1] || ''));

  // Live price estimator update
  useEffect(() => {
    const fetchLiveEstimate = async () => {
      setLoadingEstimate(true);
      try {
        const est = await getPriceEstimate({
          category: answers.gift_category || 'bespoke_curation',
          packaging: answers.packaging_style || 'linen_keepsake_box',
          personalization: answers.personalization_level || 'custom_card',
          quantity: answers.quantity || 75,
          budget_per_gift: answers.budget_range || 3500
        });
        setEstimate(est);
      } catch (err) {
        console.warn('Estimate calculation failed:', err);
      } finally {
        setLoadingEstimate(false);
      }
    };

    fetchLiveEstimate();
  }, [
    answers.gift_category,
    answers.packaging_style,
    answers.personalization_level,
    answers.quantity,
    answers.budget_range
  ]);

  // Update a single field answer
  const handleAnswerChange = (fieldKey, value) => {
    setStepError(null);
    setAnswers((prev) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Validate current step before proceeding
  const validateStep = () => {
    if (!currentQuestion) return true;

    // 1. Single card and multiselect chip questions
    if (currentQuestion.type === 'select_card' || currentQuestion.type === 'multiselect_chips') {
      if (currentQuestion.required) {
        const val = answers[currentQuestion.id];
        if (val === undefined || val === null || val === '') {
          setStepError('Please make a selection to continue your curation.');
          return false;
        }
        if (Array.isArray(val) && val.length === 0) {
          setStepError('Please select at least one recipient tier.');
          return false;
        }
      }
    }

    // 2. Text split or wedding identity questions
    if (currentQuestion.type === 'text_split' || currentQuestion.type === 'wedding_identity') {
      if (currentQuestion.fields) {
        for (const f of currentQuestion.fields) {
          if (f.required && !answers[f.name]) {
            setStepError(`Please provide ${f.label.toLowerCase()} to proceed.`);
            return false;
          }
        }
      }
    }

    // 2.1 Thoughts and vision question
    if (currentQuestion.type === 'thoughts_and_vision') {
      const thoughts = answers.thoughts?.trim();
      if (!thoughts || thoughts.length < 3) {
        setStepError("Please share what's on your mind in the thoughts field before continuing.");
        return false;
      }
      return true;
    }

    // 2.2 Logo and payment question
    if (currentQuestion.type === 'logo_and_payment') {
      const qty = parseInt(answers.quantity ?? 75, 10);
      if (isNaN(qty) || qty < 25) {
        setStepError('Minimum commission volume is 25 bespoke pieces.');
        return false;
      }
      if (answers.quantity === undefined) {
        setAnswers((prev) => ({
          ...prev,
          quantity: qty,
          budget_range: prev.budget_range || 3500
        }));
      }
      return true;
    }

    // 3. Budget and quantity question
    if (currentQuestion.type === 'budget_and_quantity') {
      const qty = parseInt(answers.quantity ?? 75, 10);
      if (isNaN(qty) || qty < 25) {
        setStepError('Minimum commission volume is 25 bespoke pieces.');
        return false;
      }
      // Ensure state holds values if user accepted defaults without interacting
      if (answers.quantity === undefined) {
        setAnswers((prev) => ({
          ...prev,
          quantity: qty,
          budget_range: prev.budget_range || 3500
        }));
      }
      return true;
    }

    // 4. Contact and logistics question
    if (currentQuestion.type === 'contact_and_logistics') {
      const cleanName = answers.client_name?.trim();
      if (!cleanName || cleanName.length < 2) {
        setStepError('Please provide your full name (at least 2 characters).');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = answers.client_email?.trim();
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setStepError('Please provide a valid contact email address (e.g. name@domain.com).');
        return false;
      }
      const cleanPhone = answers.client_phone?.trim();
      if (!cleanPhone || cleanPhone.length < 5) {
        setStepError('Please provide a valid telephone or WhatsApp contact (min 5 digits).');
        return false;
      }
      if (!answers.delivery_city?.trim()) {
        setStepError('Please specify the destination city.');
        return false;
      }
      if (!answers.delivery_date) {
        setStepError('Please select your target delivery date.');
        return false;
      }
      if (!answers.consent) {
        setStepError('Please accept the consent terms to submit your proposal.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      // Final submission
      handleSubmitCommission();
    }
  };

  const handleBack = () => {
    setStepError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset this design and start a new curation?')) {
      setAnswers({});
      setCurrentStepIndex(0);
      setSubmittedProposal(null);
      setSubmissionError(null);
    }
  };

  const handleSubmitCommission = async () => {
    setSubmitting(true);
    setSubmissionError(null);

    const payload = {
      occasion: answers.occasion || 'bespoke',
      client_name: answers.client_name?.trim() || 'Valued Patron',
      client_email: answers.client_email?.trim(),
      client_phone: answers.client_phone?.trim(),
      delivery_city: answers.delivery_city?.trim() || 'Mumbai',
      delivery_date: (answers.delivery_date || 'TBD').trim(),
      quantity: parseInt(answers.quantity, 10) || 75,
      budget_per_gift: parseFloat(answers.budget_range) || 3500,
      answers: answers,
      logo_url: answers.logo_url || null,
      reference_image_url: answers.reference_image_url || null,
      special_notes: answers.special_notes?.trim()
        ? (answers.thoughts ? `Thoughts: ${answers.thoughts}\nNotes: ${answers.special_notes.trim()}` : answers.special_notes.trim())
        : (answers.thoughts ? `Patron Thoughts: ${answers.thoughts}` : null)
    };

    try {
      const res = await submitGiftRequest(payload);
      setSubmittedProposal(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmissionError(err.message || 'Submission failed. Please check your contact fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const narrative = generateConceptNarrative(answers);

  // If commission has been submitted, render the formal Blueprint Summary screen
  if (submittedProposal) {
    const pdfUrl = getPdfUrl(submittedProposal.reference_id);

    return (
      <div className="pt-28 pb-20 px-6 md:px-12 max-w-4xl mx-auto">
        <SeoHead
          title={`Gift Concept Confirmed ${submittedProposal.reference_id} | Shvom`}
          description="Your bespoke gift concept has been registered with the Shvom atelier concierge."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-[#E7E3DC] p-8 md:p-14 shadow-elevated space-y-10"
        >
          {/* Header */}
          <div className="text-center space-y-4 pb-8 border-b border-[#E7E3DC]">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#FAF8F5] border border-[#B89B6A]/40 text-[#B89B6A] text-xs font-sans uppercase tracking-[0.2em] font-medium">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Commission Blueprint Registered</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-normal text-[#1A1A1A]">
              Your Bespoke Gift Concept
            </h1>
            <p className="font-mono text-sm text-[#8E8880]">
              Proposal Reference: <b className="text-[#1A1A1A]">{submittedProposal.reference_id}</b>
            </p>
          </div>

          {/* Editorial Narrative Card */}
          <div className="bg-[#FAF8F5] p-6 md:p-8 border-l-4 border-[#B89B6A] space-y-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-[#B89B6A] font-semibold">
              The Sensory Blueprint
            </span>
            <p className="font-serif italic text-lg sm:text-xl text-[#1A1A1A] leading-relaxed">
              "{narrative.moodText}"
            </p>
          </div>

          {/* Specifications Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="space-y-3 p-5 bg-[#FAF8F5] border border-[#E7E3DC]">
              <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#B89B6A] font-semibold">
                Event & Patron Parameters
              </h4>
              <p><b>Patron:</b> {submittedProposal.client_name}</p>
              <p><b>Email:</b> {submittedProposal.client_email}</p>
              <p><b>Destination:</b> {submittedProposal.delivery_city}</p>
              <p><b>Required Date:</b> {formatDate(submittedProposal.delivery_date)}</p>
              <p><b>Quantity Commissioned:</b> {submittedProposal.quantity} units</p>
            </div>

            <div className="space-y-3 p-5 bg-[#FAF8F5] border border-[#E7E3DC]">
              <div className="flex items-center justify-between">
                <h4 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#B89B6A] font-semibold">
                  Indicative Investment & Payment
                </h4>
                {submittedProposal.logo_url && (
                  <div className="p-1 bg-white border border-[#E7E3DC] shadow-xs">
                    <img
                      src={submittedProposal.logo_url}
                      alt="Company Logo"
                      className="h-7 max-w-[70px] object-contain"
                    />
                  </div>
                )}
              </div>
              <p><b>Per-Unit Range:</b> {formatCurrency(submittedProposal.estimated_min_unit)} &ndash; {formatCurrency(submittedProposal.estimated_max_unit)}</p>
              <p className="text-base text-[#1A1A1A]">
                <b>Total Commission:</b>{' '}
                <span className="font-bold text-[#B89B6A]">
                  {formatCurrency(submittedProposal.estimated_min_total)} &ndash; {formatCurrency(submittedProposal.estimated_max_total)}
                </span>
              </p>
              <p className="text-[11px] text-[#8E8880]">
                Includes bespoke vessel fabrication, personalization die tooling, white-glove quality assurance, and packaging.
              </p>
            </div>
          </div>

          {/* Three Key Actions */}
          <div className="pt-6 border-t border-[#E7E3DC] flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button size="lg" variant="primary" icon={Download} className="w-full sm:w-auto justify-center">
                Download Official PDF Summary
              </Button>
            </a>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/contact')}
              className="w-full sm:w-auto justify-center"
            >
              Book Physical Atelier Viewing
            </Button>

            <button
              onClick={handleReset}
              className="font-sans text-xs uppercase tracking-[0.16em] text-[#8E8880] hover:text-[#1A1A1A] p-2 flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Create Another Concept</span>
            </button>
          </div>

          <div className="text-center text-xs text-[#8E8880] space-y-1">
            <p>A formal copy of this proposal has been transmitted to your email.</p>
            <p>Our senior gifting concierge will contact you within 24 hours to arrange tactile sample review.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active Guided Flow
  return (
    <>
      <SeoHead
        title="Interactive Return Gift Designer | Shvom"
        description="Design your custom return gift through our guided question flow with live concept blueprint and pricing calculation."
      />

      <div className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-screen">
        {/* Top Controls: Back / Reset / Phase Indicator */}
        <div className="flex items-center justify-between pb-6 border-b border-[#E7E3DC] mb-8">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-[0.16em] text-[#5A5A58] hover:text-[#1A1A1A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous Question</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="text-[11px] font-sans uppercase tracking-[0.16em] text-[#8E8880] hover:text-[#1A1A1A] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          currentStep={currentStepIndex + 1}
          totalSteps={totalSteps}
          stepTitles={stepTitles}
        />

        {submissionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-xs">
            {submissionError}
          </div>
        )}

        {/* Main Grid: Question Card on Left, Live Summary on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Question Flow Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-transparent">
              <AnimatePresence mode="wait">
                <QuestionCard
                  key={currentQuestion.id}
                  question={currentQuestion}
                  answers={answers}
                  onChange={handleAnswerChange}
                  error={stepError}
                />
              </AnimatePresence>
            </div>

            {/* Navigation Next / Submit Actions */}
            {submissionError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs">
                {submissionError}
              </div>
            )}
            <div className="pt-8 border-t border-[#E7E3DC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <span className="text-xs text-[#8E8880] text-center sm:text-left order-2 sm:order-1">
                {currentStepIndex + 1} of {totalSteps} questions answered
              </span>

              <div className="flex items-center gap-4 w-full sm:w-auto order-1 sm:order-2">
                {currentStepIndex < totalSteps - 1 ? (
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={handleNext}
                    icon={ArrowRight}
                    className="w-full sm:w-auto justify-center"
                  >
                    Proceed &rarr;
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="gold"
                    onClick={handleNext}
                    loading={submitting}
                    icon={Send}
                    className="w-full sm:w-auto justify-center"
                  >
                    Submit Bespoke Quote Request
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Live Summary Panel Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <SummaryPanel
              answers={answers}
              estimate={estimate}
              loadingEstimate={loadingEstimate}
            />
          </div>
        </div>
      </div>
    </>
  );
}
