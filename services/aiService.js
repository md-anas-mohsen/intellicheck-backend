const fetch = require("node-fetch");

const AssessmentSolution = require("../models/assessmentSolution");
const Assessment = require("../models/assessment");
const Course = require("../models/course");

const AI_API_URL = process.env.AI_API_URL;

exports.formatScore = (threshold, score, totalMarks) => {
  marks = 0;
  threshold.get(`${totalMarks}`).forEach((mean) => {
    if (score >= mean) {
      marks += 1;
    } else {
      return marks;
    }
  });

  return marks;
};

exports.computeMarks = async (course, question, answer) => {
  const marks = await fetch(`${AI_API_URL}/${course.courseEmbeddingUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      markingScheme: question.msAnswer,
      studentResponse: answer,
    }),
  })
    .then((response) => response.json())
    .then((data) =>
      this.formatScore(course.threshold, data.score, question.totalMarks)
    );

  return { question: question._id, marks };
};

exports.gradeSolution = async (assessmentSolution) => {
  const assessment = await Assessment.findById(assessmentSolution.assessmentId)
    .populate({
      path: "classId",
    })
    .exec();

  const course = await Course.findOne({
    courseCode: assessment.classId?.courseCode,
  });

  assessmentSolution = await AssessmentSolution.findById(assessmentSolution._id)
    .populate({
      path: "studentAnswers",
      populate: { path: "question", model: "Question" },
    })
    .exec();

  let promises = assessmentSolution.studentAnswers?.map((studentAnswer) => {
    return this.computeMarks(
      course,
      studentAnswer.question,
      studentAnswer.answer
    );
  });

  let gradedAnswers = await Promise.all(promises);

  let marksObtained = 0;

  for (let i = 0; i < gradedAnswers.length; i++) {
    assessmentSolution.studentAnswers[i].marks = gradedAnswers[i]?.marks;
    marksObtained += gradedAnswers[i]?.marks;
  }

  assessmentSolution.obtainedMarks = marksObtained;
  assessmentSolution.status = "GRADED";

  assessmentSolution.save();
};
