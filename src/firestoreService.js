import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { employees as seedEmployees, questions as seedQuestions } from "./data";

const questionsCollection = collection(db, "questions");
const evaluationsCollection = collection(db, "evaluations");
const employeesCollection = collection(db, "employees");

export async function seedQuestionsIfEmpty() {
  const snapshot = await getDocs(questionsCollection);

  if (!snapshot.empty) {
    return;
  }

  await Promise.all(
    seedQuestions.map((question, index) =>
      setDoc(doc(db, "questions", question.id), {
        ...question,
        order: index + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function getQuestions({ seed = false } = {}) {
  if (seed) {
    await seedQuestionsIfEmpty();
  }

  const snapshot = await getDocs(query(questionsCollection, orderBy("order", "asc")));

  return snapshot.docs.map((questionDoc) => ({
    id: questionDoc.id,
    ...questionDoc.data(),
  }));
}

export async function seedEmployeesIfEmpty() {
  const snapshot = await getDocs(employeesCollection);

  if (!snapshot.empty) {
    return;
  }

  await Promise.all(
    seedEmployees.map((employee, index) =>
      setDoc(doc(db, "employees", employee.id), {
        ...employee,
        order: index + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function getEmployees({ seed = false } = {}) {
  if (seed) {
    await seedEmployeesIfEmpty();
  }

  const snapshot = await getDocs(query(employeesCollection, orderBy("order", "asc")));

  return snapshot.docs.map((employeeDoc) => ({
    id: employeeDoc.id,
    ...employeeDoc.data(),
  }));
}

export async function getEvaluations() {
  const snapshot = await getDocs(evaluationsCollection);

  return snapshot.docs.map((evaluationDoc) => ({
    id: evaluationDoc.id,
    ...evaluationDoc.data(),
  }));
}

export async function updateQuestionStatus(id, active) {
  await updateDoc(doc(db, "questions", id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function saveEmployee(employee) {
  const payload = {
    name: employee.name.trim(),
    role: employee.role.trim(),
    avatar: employee.avatar.trim(),
    status: employee.status,
    order: employee.order,
    updatedAt: serverTimestamp(),
  };

  if (employee.id) {
    await updateDoc(doc(db, "employees", employee.id), payload);
    return employee.id;
  }

  const newEmployeeRef = await addDoc(employeesCollection, {
    ...payload,
    createdAt: serverTimestamp(),
  });

  return newEmployeeRef.id;
}

export async function saveQuestion(question) {
  const payload = {
    title: question.title.trim(),
    description: question.description.trim(),
    active: question.active,
    order: question.order,
    updatedAt: serverTimestamp(),
  };

  if (question.id) {
    await updateDoc(doc(db, "questions", question.id), payload);
    return question.id;
  }

  const newQuestionRef = await addDoc(questionsCollection, {
    ...payload,
    createdAt: serverTimestamp(),
  });

  return newQuestionRef.id;
}

export async function saveEvaluation({ employee, answers, questions, score }) {
  return addDoc(evaluationsCollection, {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeRole: employee.role,
    answers,
    questions: questions.map((question) => ({
      id: question.id,
      title: question.title,
      description: question.description,
    })),
    score,
    createdAt: serverTimestamp(),
  });
}
