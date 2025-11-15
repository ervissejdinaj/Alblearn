# Completion Tracking Flow - Duke përdorur API-të ekzistuese

## Përmbledhje

Sistemi i tracking-ut të completimit funksionon duke përdorur **vetëm API-të
ekzistuese** nga backend-i. Nuk kemi shtuar asnjë API të re - gjithçka
mbështetet në endpoint-et që ishin tashmë në koleksionin Postman.

---

## API-të që përdoren

### 1. **Get Module Progress** ✅

```
GET /api/v1/modules/{slug}/progress
```

**Përdorimi:**

- Merr progress-in e plotë të modulit për përdoruesin aktual
- Përfshin të dhëna për çdo seksion (completion status, quiz progress)
- E përdorur në `ModuleViewer`, `SectionViewer`, dhe `QuizPage`

**Response Structure:**

```typescript
{
  module_id: string;
  module_slug: string;
  enrollment_id?: string;
  progress_percentage: number;
  completed_sections: number;
  total_sections: number;
  sections: [
    {
      section_id: string;
      is_completed: boolean;
      completed_at: string | null;
      quiz_progress?: {
        completed_quizzes: number;
        total_quizzes: number;
        score: number;
      }
    }
  ];
  is_completed: boolean;
  completed_at: string | null;
}
```

### 2. **Submit Quiz Answer** ✅

```
POST /api/v1/quizzes/{quiz_id}/submit
Body: { user_answer: string }
```

**Përdorimi:**

- Dërgon përgjigjet e quiz-eve
- Backend-i automatikisht përditëson progress-in
- Kur të gjitha quiz-et e një seksioni kompletohen → seksioni shënohet si i
  kompletuar

### 3. **Get Section Quiz Progress** ✅

```
GET /api/v1/sections/{section_id}/quiz-progress
```

**Përdorimi:**

- Merr progress-in specifik të quiz-eve për një seksion
- E përdorur në `QuizPage` për të shfaqur statistikat

---

## Flow-i i Completimit

### **1. Student hap një Module**

→ `ModuleViewer.tsx` thërret `progressApi.module(slug)` → Merr gjendjen e plotë
të completimit për të gjitha seksionet → Shfaq:

- ✅ Seksionet e kompletuara (me data të completimit)
- 🔒 Seksionet e bllokuara (duhet të kompletojnë seksionin paraprak)
- 📖 Seksionin aktual që mund ta aksesojnë

### **2. Student hap një Section**

→ `SectionViewer.tsx` thërret `progressApi.module(slug)` → Kontrollon nëse
seksioni është i aksesueshem (bazuar në completimin e seksionit paraprak) → Nëse
seksioni paraprak nuk është i kompletuar → Shfaqet ekrani "Section Locked" 🔒 →
Nëse është i aksesueshem → Studenti mund të lexojë përmbajtjen

### **3. Student kalon në Quiz**

→ `QuizPage.tsx` ngarkon modulin dhe seksionin → Studenti mund të bëjë quiz-et
**direkt** (pa kufizime shtesë) → Quiz-et janë pjesë e procesit të mësimit, jo
diçka që vjen pas completimit

### **4. Student dërgon përgjigjet e Quiz**

→ `QuizPage.tsx` thërret `quizApi.submit(quiz_id, { user_answer })` → Backend-i:

- E vlerëson përgjigjen
- E regjistron përgjigjen në databazë
- **Automatikisht** përditëson progress-in e seksionit
- Kur të gjitha quiz-et janë bërë me sukses → Seksioni shënohet si i kompletuar

### **5. Student kalon në Section tjetër**

→ `SectionViewer.tsx` thërret `loadModuleProgress()` për të rifreskuar gjendjen
→ Backend-i kthen progress-in e përditësuar → Sistemi kontrollon nëse seksioni i
ri është i aksesueshem

---

## Access Control Logic

### **ModuleViewer** - Kontrollon aksesueshmërinë e seksioneve

```typescript
const isSectionAccessible = (
  section: ModuleSection,
  sectionIndex: number
): boolean => {
  if (!isEnrolled) return false; // Duhet të jetë i regjistruar
  if (sectionIndex === 0) return true; // Seksioni i parë gjithmonë i hapur
  if (!moduleProgress) return true; // Nëse nuk ka të dhëna, lejo (backend-i e kontrollon)

  // Kontrollo nëse seksioni paraprak është kompletuar
  const previousSection = sections[sectionIndex - 1];
  const previousProgress = moduleProgress.sections.find(
    (sp) => sp.section_id === previousSection.id
  );

  return previousProgress?.is_completed ?? false;
};
```

### **SectionViewer** - Bllokon seksionet që nuk janë të aksesueshem

```typescript
const canAccessSection = useMemo(() => {
  if (currentIndex === 0) return true; // Seksioni i parë
  if (!moduleProgress) return true; // Nëse nuk ka të dhëna, lejo

  // Kontrollo seksionin paraprak
  if (currentIndex > 0 && previousSection) {
    const previousProgress = moduleProgress.sections.find(
      (sp) => sp.section_id === previousSection.id
    );
    return previousProgress?.is_completed ?? false;
  }

  return true;
}, [currentIndex, moduleProgress, previousSection]);
```

### **QuizPage** - Nuk ka kufizime shtesë

Quiz-et janë pjesë e procesit të mësimit. Studenti mund t'i bëjë quiz-et sapo të
aksesojë seksionin, pa pasur nevojë të kompletojë përmbajtjen fillimisht.
Backend-i mund të zbatojë kufizime nëse është e nevojshme.

---

## Backend Dependencies

Backend-i duhet të implementojë logjikën e mëposhtme:

### 1. **Automatic Section Completion**

Backend-i duhet të shënojë një seksion si të kompletuar kur:

- Studenti kompletonë të gjitha quiz-et e seksionit me sukses, OSE
- Studenti e përfundon përmbajtjen e seksionit (nëse nuk ka quiz)
- Logjika e saktë varet nga implementimi i backend-it

### 2. **Module Progress Calculation**

Backend-i llogarit:

- `progress_percentage` bazuar në seksionet e kompletuara
- `completed_sections` vs `total_sections`
- Quiz scores dhe completion per section

### 3. **Sequential Access Enforcement**

Backend-i gjithashtu duhet të kontrollojë (si fallback):

- Nëse studenti përpiqet të aksesojë një seksion pa e kompletuar paraardhësin
- Frontend-i e kontrollon këtë, por backend-i duhet të jetë burim i të vërtetës

---

## Përparësitë e këtij Approach

✅ **Nuk ka API të reja** - Përdor endpoint-et ekzistuese ✅ **Single source of
truth** - Të gjitha të dhënat vijnë nga `/modules/{slug}/progress` ✅ **Backend
kontrollon logjikën** - Frontend-i vetëm shfaq gjendjen ✅ **Konsistent UX** -
Të gjitha komponentet përdorin të njëjtën logjikë ✅ **Real-time updates** -
Progress refreskohet pas çdo veprimi

---

## Çfarë duhet të implementohet në Backend

Backend-i tashmë duhet të ketë (ose duhet të shtojë):

1. **Automatic tracking** kur studenti shikon një seksion
2. **Section completion** kur të gjitha quiz-et janë bërë me sukses
3. **Module progress** që përditësohet në kohë reale
4. **Access control** për të parandaluar skipim-in e seksioneve

Nëse backend-i nuk e bën këtë automatikisht, atëherë duhet të implementohet
aty - jo në frontend!
