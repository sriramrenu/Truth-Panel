'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type QuestionType = 'multiple_choice' | 'checkboxes' | 'short_text';

interface FormQuestion {
	id: string;
	type: QuestionType;
	questionText: string;
	options?: string[];
	isEditable?: boolean;
}

interface TruthPanelForm {
	id: string;
	title: string;
	description: string;
	createdAt: string;
	questions: FormQuestion[];
}

const STORAGE_KEY = 'truth_panel_forms';

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createQuestion = (): FormQuestion => ({
	id: createId(),
	type: 'multiple_choice',
	questionText: '',
	options: ['', ''],
	isEditable: true,
});

const isQuestionComplete = (question: FormQuestion) => {
	if (!question.questionText.trim()) {
		return false;
	}

	if (question.type === 'short_text') {
		return true;
	}

	const options = question.options ?? [];
	return options.some((option) => option.trim().length > 0);
};

const getTypeLabel = (type: QuestionType) => {
	if (type === 'multiple_choice') return 'Multiple Choice';
	if (type === 'checkboxes') return 'Checkboxes';
	return 'Short Text';
};

const readForms = (): TruthPanelForm[] => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed;
	} catch {
		return [];
	}
};

export default function FormBuilderPage() {
	const router = useRouter();
	const [formId, setFormId] = useState(createId());
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [questions, setQuestions] = useState<FormQuestion[]>([createQuestion()]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [deleteTarget, setDeleteTarget] = useState<FormQuestion | null>(null);

	useEffect(() => {
		// Try to load from sessionStorage draft
		const draft = sessionStorage.getItem('truth_panel_draft');
		if (draft) {
			try {
				const parsed = JSON.parse(draft);
				// Only restore if draft has actual content
				if (parsed.questions && parsed.questions.length > 0) {
					setFormId(parsed.id || createId());
					setTitle(parsed.title || '');
					setDescription(parsed.description || '');
					setQuestions(parsed.questions);
					setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
				}
			} catch {
				// Corrupted draft, use defaults
			}
		}
	}, []);

	const currentQuestion = questions[currentQuestionIndex] ?? createQuestion();
	const canGoPrev = currentQuestionIndex > 0;
	const canGoNext =
		currentQuestionIndex < questions.length - 1 && isQuestionComplete(currentQuestion);

	const canPreview = useMemo(
		() =>
			title.trim().length > 0 &&
			questions.length > 0 &&
			questions.every((question) => question.questionText.trim().length > 0),
		[title, questions],
	);

	const updateCurrentQuestion = (updates: Partial<FormQuestion>) => {
		setQuestions((prev) =>
			prev.map((question, index) =>
				index === currentQuestionIndex
					? {
							...question,
							...updates,
						}
					: question,
			),
		);
	};

	const handleTypeChange = (value: QuestionType) => {
		if (value === 'short_text') {
			updateCurrentQuestion({ type: value, options: undefined });
			return;
		}

		updateCurrentQuestion({
			type: value,
			options:
				currentQuestion.options && currentQuestion.options.length > 0
					? currentQuestion.options
					: ['', ''],
		});
	};

	const handleOptionChange = (optionIndex: number, value: string) => {
		const nextOptions = [...(currentQuestion.options ?? [])];
		nextOptions[optionIndex] = value;
		updateCurrentQuestion({ options: nextOptions });
	};

	const handleAddOption = () => {
		const nextOptions = [...(currentQuestion.options ?? []), ''];
		updateCurrentQuestion({ options: nextOptions });
	};

	const handleRemoveOption = (optionIndex: number) => {
		const nextOptions = (currentQuestion.options ?? []).filter((_, index) => index !== optionIndex);
		updateCurrentQuestion({ options: nextOptions.length ? nextOptions : [''] });
	};

	const handleAddQuestion = () => {
		const nextQuestion = createQuestion();
		setQuestions((prev) => [...prev, nextQuestion]);
		setCurrentQuestionIndex(questions.length);
	};

	const handleDeleteQuestion = () => {
		if (!deleteTarget) return;

		setQuestions((prev) => {
			const filtered = prev.filter((question) => question.id !== deleteTarget.id);
			if (filtered.length === 0) {
				setCurrentQuestionIndex(0);
				return [createQuestion()];
			}

			const removedIndex = prev.findIndex((question) => question.id === deleteTarget.id);
			setCurrentQuestionIndex((current) => {
				if (current > removedIndex) return current - 1;
				if (current === removedIndex) return Math.max(0, current - 1);
				return current;
			});

			return filtered;
		});

		setDeleteTarget(null);
	};

	const persistAndGoPreview = () => {
		const draft = {
			id: formId,
			title: title.trim(),
			description: description.trim(),
			questions: questions.map(({ isEditable, ...q }) => ({
				...q,
				questionText: q.questionText.trim(),
				options:
					q.type === 'short_text'
						? undefined
						: (q.options ?? []).map((o) => o.trim()).filter(Boolean),
			})),
			currentQuestionIndex,
		};
		sessionStorage.setItem('truth_panel_draft', JSON.stringify(draft));
		router.push('/Frontend/AdminPanel/FormCreation/Preview');
	};

	return (
		<main className="min-h-screen bg-white text-[var(--OffBlack)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-36">
				<header className="flex items-center gap-3 border-b border-[color:var(--OffBlack)]/8 px-4 py-3">
					<button
						type="button"
						onClick={() => router.back()}
						className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 bg-[var(--OffWhite)] font-[var(--font-poppins)] text-lg"
						aria-label="Go back"
					>
						{'<'}
					</button>
					<h1 className="font-[var(--font-poppins)] text-lg font-medium">Form Builder</h1>
				</header>

				<section className="space-y-5 px-4 py-5">
					<div className="space-y-4">
						<label className="block border-b border-[color:var(--OffBlack)]/18 pb-2">
							<span className="sr-only">Form Title</span>
							<input
								type="text"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="Form Title"
								className="w-full bg-transparent font-[var(--font-poppins)] text-base font-medium outline-none placeholder:text-[var(--OffBlack)]/40 focus:border-[var(--PBlue)]"
							/>
						</label>

						<label className="block border-b border-[color:var(--OffBlack)]/18 pb-2">
							<span className="sr-only">Form Description</span>
							<input
								type="text"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								placeholder="Form Description"
								className="w-full bg-transparent font-[var(--font-inter)] text-sm font-normal outline-none placeholder:text-[var(--OffBlack)]/40"
							/>
						</label>
					</div>

					<article className="rounded-2xl border border-[color:var(--OffBlack)]/10 bg-[var(--OffWhite)] p-4 shadow-sm">
						<div className="mb-3 flex items-center justify-between">
							<p className="font-[var(--font-poppins)] text-sm font-medium text-[var(--PBlue)]">
								Question {currentQuestionIndex + 1}
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => updateCurrentQuestion({ isEditable: !currentQuestion.isEditable })}
									className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--OffBlack)]/15 bg-white"
									aria-label={currentQuestion.isEditable ? 'Lock question editing' : 'Edit question'}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path
											d="M4 20H8L18.5 9.5C19.1 8.9 19.1 7.9 18.5 7.3L16.7 5.5C16.1 4.9 15.1 4.9 14.5 5.5L4 16V20Z"
											stroke="currentColor"
											strokeWidth="1.8"
										/>
									</svg>
								</button>
								<button
									type="button"
									onClick={() => setDeleteTarget(currentQuestion)}
									className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600"
									aria-label="Delete question"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path
											d="M5 7H19M9 7V5H15V7M9 10V17M12 10V17M15 10V17M7 7L8 19H16L17 7"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
							</div>
						</div>

						<div className="space-y-3">
							<input
								type="text"
								disabled={!currentQuestion.isEditable}
								value={currentQuestion.questionText}
								onChange={(event) => updateCurrentQuestion({ questionText: event.target.value })}
								placeholder="Type your question here..."
								className="w-full rounded-xl border border-[color:var(--OffBlack)]/12 bg-white px-3 py-3 font-[var(--font-inter)] text-sm outline-none focus:border-[var(--PBlue)] disabled:cursor-not-allowed disabled:bg-[color:rgba(255,255,255,0.65)]"
							/>

							<select
								disabled={!currentQuestion.isEditable}
								value={currentQuestion.type}
								onChange={(event) => handleTypeChange(event.target.value as QuestionType)}
								className="w-full rounded-xl border border-[color:var(--OffBlack)]/12 bg-white px-3 py-3 font-[var(--font-inter)] text-sm outline-none focus:border-[var(--PBlue)] disabled:cursor-not-allowed disabled:bg-[color:rgba(255,255,255,0.65)]"
							>
								<option value="multiple_choice">Multiple Choice (single answer)</option>
								<option value="checkboxes">Checkboxes (multiple answers)</option>
								<option value="short_text">Short Text</option>
							</select>

							{currentQuestion.type === 'short_text' ? (
								<input
									type="text"
									disabled
									value=""
									placeholder="User will type here..."
									className="w-full rounded-xl border border-[color:var(--OffBlack)]/12 bg-white px-3 py-3 font-[var(--font-inter)] text-sm placeholder:text-[var(--OffBlack)]/45"
								/>
							) : (
								<div className="space-y-2">
									{(currentQuestion.options ?? []).map((option, optionIndex) => (
										<div key={`${currentQuestion.id}-${optionIndex}`} className="flex items-center gap-2">
											<input
												type="text"
												disabled={!currentQuestion.isEditable}
												value={option}
												onChange={(event) => handleOptionChange(optionIndex, event.target.value)}
												placeholder={`Option ${optionIndex + 1}`}
												className="w-full rounded-xl border border-[color:var(--OffBlack)]/12 bg-white px-3 py-2.5 font-[var(--font-inter)] text-sm outline-none focus:border-[var(--PBlue)] disabled:cursor-not-allowed disabled:bg-[color:rgba(255,255,255,0.65)]"
											/>
											<button
												type="button"
												disabled={!currentQuestion.isEditable}
												onClick={() => handleRemoveOption(optionIndex)}
												className="rounded-lg border border-red-200 bg-white px-2 py-2 font-[var(--font-inter)] text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
												aria-label={`Delete option ${optionIndex + 1}`}
											>
												Del
											</button>
										</div>
									))}

									<button
										type="button"
										disabled={!currentQuestion.isEditable}
										onClick={handleAddOption}
										className="font-[var(--font-poppins)] text-sm font-medium text-[var(--PBlue)] disabled:cursor-not-allowed disabled:opacity-50"
									>
										+ Add Option
									</button>
								</div>
							)}

							<p className="font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/60">
								Type: {getTypeLabel(currentQuestion.type)}
							</p>
						</div>
					</article>
				</section>
			</div>

			<div className="fixed inset-x-0 bottom-30 z-30 flex justify-center px-4">
				<button
					type="button"
					disabled={!canPreview}
					onClick={persistAndGoPreview}
					className="w-full max-w-[358px] rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-white shadow-[0_10px_24px_rgba(28,105,174,0.28)] disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					Preview Form
				</button>
			</div>

			<nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center">
				<div className="relative w-full max-w-[390px]">
					<div className="flex h-20 items-end justify-between rounded-t-[24px] bg-[var(--PBlue)] px-6 pb-4 pt-4">
						<button
							type="button"
							disabled={!canGoPrev}
							onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
							className="min-w-16 rounded-lg border border-[color:rgba(237,247,246,0.4)] px-3 py-1.5 font-[var(--font-poppins)] text-xs font-medium text-[var(--OffWhite)] disabled:cursor-not-allowed disabled:opacity-45"
						>
							Prev
						</button>

						<p className="pb-0.5 font-[var(--font-poppins)] text-sm font-medium text-white">
							{currentQuestionIndex + 1} / {questions.length}
						</p>

						<button
							type="button"
							disabled={!canGoNext}
							onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
							className="min-w-16 rounded-lg border border-[color:rgba(237,247,246,0.4)] px-3 py-1.5 font-[var(--font-poppins)] text-xs font-medium text-[var(--OffWhite)] disabled:cursor-not-allowed disabled:opacity-45"
						>
							Next
						</button>
					</div>

					<button
						type="button"
						onClick={handleAddQuestion}
						className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--SYellow)] shadow-[0_10px_22px_rgba(13,22,11,0.18)]"
						aria-label="Add question"
					>
						<span className="text-4xl leading-none text-white">+</span>
					</button>
				</div>
			</nav>

			{deleteTarget ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-5">
					<div className="w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
						<p className="font-[var(--font-poppins)] text-base font-medium text-[var(--OffBlack)]">Delete question</p>
						<p className="mt-2 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">
							Are you sure you want to delete this question?
						</p>

						<div className="mt-5 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setDeleteTarget(null)}
								className="rounded-lg border border-[color:var(--OffBlack)]/15 px-4 py-2 font-[var(--font-inter)] text-sm"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeleteQuestion}
								className="rounded-lg bg-red-600 px-4 py-2 font-[var(--font-inter)] text-sm text-white"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
