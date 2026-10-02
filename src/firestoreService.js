import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
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
    ...questionDoc.data(),
    id: questionDoc.id,
  }));
}

export async function seedEmployeesIfEmpty() {
  const snapshot = await getDocs(employeesCollection);

  if (!snapshot.empty) {
    return;
  }

  // Los empleados usan IDs generados por Firestore: así sus enlaces (/encuesta/<id>) no dependen del nombre.
  await Promise.all(
    seedEmployees.map(({ id: _seedId, ...employee }, index) =>
      setDoc(doc(employeesCollection), {
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
    ...employeeDoc.data(),
    id: employeeDoc.id,
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

// Empleados creados con el nombre como ID (versiones anteriores de los datos iniciales).
const legacyEmployeeIds = new Set(seedEmployees.map((employee) => employee.id));

export function hasLegacyEmployeeId(employee) {
  return legacyEmployeeIds.has(employee.id);
}

// Mueve un empleado a un ID generado y reasigna sus evaluaciones, para no perder su historial.
// El documento viejo se borra al final, cuando todo lo demás ya se guardó.
export async function migrateEmployeeToGeneratedId(employeeId) {
  const oldRef = doc(db, "employees", employeeId);
  const [employeeDoc, evaluationsSnapshot, previousCopy] = await Promise.all([
    getDoc(oldRef),
    getDocs(query(evaluationsCollection, where("employeeId", "==", employeeId))),
    // Si un intento anterior se cortó a la mitad, reutiliza la copia ya creada en vez de duplicarla.
    getDocs(query(employeesCollection, where("legacyId", "==", employeeId))),
  ]);

  if (!employeeDoc.exists()) {
    return null;
  }

  const newRef = previousCopy.docs[0]?.ref ?? doc(employeesCollection);
  const { id: _legacyId, ...data } = employeeDoc.data();
  await setDoc(newRef, { ...data, legacyId: employeeId, updatedAt: serverTimestamp() });

  // Firestore permite hasta 500 operaciones por lote.
  const evaluationDocs = evaluationsSnapshot.docs;
  for (let start = 0; start < evaluationDocs.length; start += 450) {
    const batch = writeBatch(db);
    evaluationDocs.slice(start, start + 450).forEach((evaluationDoc) => {
      batch.update(evaluationDoc.ref, { employeeId: newRef.id });
    });
    await batch.commit();
  }

  const finalBatch = writeBatch(db);
  finalBatch.delete(oldRef);
  await finalBatch.commit();

  return newRef.id;
}

// Suscripciones en tiempo real para el panel admin. Cada una devuelve la función para cancelarla.
function subscribe(source, onData, onError) {
  return onSnapshot(
    source,
    (snapshot) => onData(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))),
    onError,
  );
}

export function subscribeEmployees(onData, onError) {
  return subscribe(query(employeesCollection, orderBy("order", "asc")), onData, onError);
}

export function subscribeQuestions(onData, onError) {
  return subscribe(query(questionsCollection, orderBy("order", "asc")), onData, onError);
}

export function subscribeEvaluations(onData, onError) {
  return subscribe(evaluationsCollection, onData, onError);
}
