const QuestionGradingStrategy = require("./questionGradingStrategy");

class FillInBlankQuestionGradingStrategy extends QuestionGradingStrategy {
  constructor(course, question, answer) {
    super(course, question, answer);
  }

  async gradeAnswer() {
    if (
      this._answer.toLowerCase() ===
      this._question?.msAnswer[0][0].toLowerCase()
    ) {
      return { question: this._question._id, marks: this._question.totalMarks };
    }
    return { question: this._question._id, marks: 0 };
  }
}

module.exports = FillInBlankQuestionGradingStrategy;
