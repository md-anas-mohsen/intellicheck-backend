const AssessmentSolution = require("../../models/assessmentSolution");
const Assessment = require("../../models/assessment");
const Course = require("../../models/course");

const QuestionGradingStrategyFactory = require("./strategies/questionGradingFactory");
const {
  questionType,
  solutionGradingType,
} = require("../../constants/assessment");
const assessmentSolution = require("../../models/assessmentSolution");

const questionGradingFactory = new QuestionGradingStrategyFactory();

class GradingTypeFactory {
  #course;
  #assessmentSolution;

  constructor(course, assessmentSolution) {
    this.#course = course;
    this.#assessmentSolution = assessmentSolution;
  }

  async performGrading(gradingType) {
    switch (gradingType) {
      case solutionGradingType.AI_GRADING: {
        await this.#aiGrading();
        break;
      }
      case solutionGradingType.MANUAL_GRADING: {
        await this.#manualGrading();
        break;
      }
    }
  }

  async #aiGrading() {
    console.log("AI GRADING HAPPENING");
    this.#assessmentSolution = await this.#gradeQuestions();
    this.#assessmentSolution.status = "GRADED";
    await this.#assessmentSolution.save();
  }

  async #manualGrading() {
    const studentAnswersMap = {};

    this.#assessmentSolution.studentAnswers.forEach((studentAnswer) => {
      studentAnswersMap[studentAnswer._id] = studentAnswer;
    });

    this.#assessmentSolution.studentAnswers =
      this.#assessmentSolution.studentAnswers.filter(
        (studentAnswer) =>
          studentAnswer.question?.questionType !== questionType.DESCRIPTIVE
      );

    this.#assessmentSolution = await this.#gradeQuestions();

    this.#assessmentSolution.studentAnswers?.forEach((gradedStudentAnswer) => {
      studentAnswersMap[gradedStudentAnswer._id] = gradedStudentAnswer;
    });
    this.#assessmentSolution.studentAnswers = Object.values(studentAnswersMap);

    await this.#assessmentSolution.save();
  }

  async #gradeQuestions() {
    let promises = this.#assessmentSolution.studentAnswers?.map(
      (studentAnswer) => {
        return questionGradingFactory
          .getGradingStrategy(
            this.#course,
            studentAnswer.question,
            studentAnswer.answer
          )
          .gradeAnswer();
      }
    );

    let gradedAnswers = await Promise.all(promises);

    let marksObtained = 0;

    for (let i = 0; i < gradedAnswers.length; i++) {
      this.#assessmentSolution.studentAnswers[i].marks =
        gradedAnswers[i]?.marks;
      marksObtained += gradedAnswers[i]?.marks;
    }

    this.#assessmentSolution.obtainedMarks = marksObtained;

    return this.#assessmentSolution;
  }
}

exports.gradeSolution = async (assessmentSolution) => {
  const assessment = await Assessment.findById(assessmentSolution.assessmentId)
    .populate({
      path: "classId",
    })
    .exec();

  const allowManualGradingOnly = assessment.allowManualGrading;

  const course = await Course.findOne({
    courseCode: assessment.classId?.courseCode,
  });

  assessmentSolution = await AssessmentSolution.findById(assessmentSolution._id)
    .populate({
      path: "studentAnswers",
      populate: { path: "question", model: "Question" },
    })
    .exec();

  const gradingType = allowManualGradingOnly
    ? solutionGradingType.MANUAL_GRADING
    : solutionGradingType.AI_GRADING;

  const gradingTypeFactory = new GradingTypeFactory(course, assessmentSolution);

  await gradingTypeFactory.performGrading(gradingType);
};
