import fs from "node:fs";

const concepts = JSON.parse(fs.readFileSync("data/math-concepts.json", "utf8")).concepts;
const [{ fullCourseGuides, createGeneratedLessons }, { lessonModules: base }, { lessonModulesBatch02 }, { lessonModulesBatch03 }, { lessonModulesBatch04a }, { lessonModulesBatch04b }, { lessonModulesBatch05a }, { lessonModulesBatch05b }] = await Promise.all([
  import("../app/content/full-course.ts"),
  import("../app/content/lesson-modules.ts"),
  import("../app/content/lesson-modules-batch-02.ts"),
  import("../app/content/lesson-modules-batch-03.ts"),
  import("../app/content/lesson-modules-batch-04a.ts"),
  import("../app/content/lesson-modules-batch-04b.ts"),
  import("../app/content/lesson-modules-batch-05a.ts"),
  import("../app/content/lesson-modules-batch-05b.ts"),
]);

const authored = [...base, ...lessonModulesBatch02, ...lessonModulesBatch03, ...lessonModulesBatch04a, ...lessonModulesBatch04b, ...lessonModulesBatch05a, ...lessonModulesBatch05b];
const lessons = [...authored, ...createGeneratedLessons(new Set(authored.map((lesson) => lesson.conceptId)))];
const guides = fullCourseGuides();
const errors = [];
const conceptIds = new Set(concepts.map((concept) => concept.id));

if (Object.keys(guides).length !== concepts.length) errors.push(`guides ${Object.keys(guides).length}/${concepts.length}`);
if (new Set(lessons.map((lesson) => lesson.conceptId)).size !== concepts.length) errors.push("lesson concept IDs are not one-to-one");
for (const concept of concepts) {
  const guide = guides[concept.id];
  const lesson = lessons.find((candidate) => candidate.conceptId === concept.id);
  if (!guide || !guide.definition || !guide.firstMove || !guide.trap) errors.push(`${concept.id}: incomplete guide`);
  if (!lesson) {
    errors.push(`${concept.id}: missing lesson`);
    continue;
  }
  if (!lesson.explanation || !lesson.whyItMatters || lesson.workedExample.steps.length < 2 || lesson.commonMistakes.length < 2 || !lesson.quickCheck.problem || !lesson.quickCheck.answer || !lesson.quickCheck.explanation) errors.push(`${concept.id}: incomplete lesson fields`);
  if (lesson.prerequisiteIds.some((id) => !conceptIds.has(id))) errors.push(`${concept.id}: lesson has unknown prerequisite`);
}

const result = { ok: errors.length === 0, concepts: concepts.length, guides: Object.keys(guides).length, lessons: lessons.length, authoredLessons: authored.length, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length > 0) process.exitCode = 1;
