const MESSAGES = require("../../../constants/messages");

class QuestionGradingStrategy {
  _course;
  _question;
  _answer;

  constructor(course, question, answer) {
    if (this.constructor === QuestionGradingStrategy) {
      throw new Error(MESSAGES.CANNOT_INSTANTIATE_ABSTRACT_CLASS);
    }
    this._course = course;
    this._question = question;
    this._answer = answer;
  }

  async gradeAnswer(course, question, answer) {
    if (this.constructor === QuestionGradingStrategy) {
      throw new Error(MESSAGES.CANNOT_INSTANTIATE_ABSTRACT_CLASS);
    }
  }
}

module.exports = QuestionGradingStrategy;
