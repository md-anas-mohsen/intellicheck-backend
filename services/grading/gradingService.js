const AssessmentSolution = require("../../models/assessmentSolution");
const Assessment = require("../../models/assessment");
const Course = require("../../models/course");

const QuestionGradingStrategyFactory = require("./strategies/questionGradingFactory");

const questionGradingFactory = new QuestionGradingStrategyFactory();

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
    return questionGradingFactory
      .getGradingStrategy(course, studentAnswer.question, studentAnswer.answer)
      .gradeAnswer();
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
