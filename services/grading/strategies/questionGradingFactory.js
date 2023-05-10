const { questionType } = require("../../../constants/assessment");
const DescriptiveQuestionGradingStrategy = require("./descriptiveQuestionGradingStrategy");
const FillInBlankQuestionGradingStrategy = require("./fillInBlankQuestionGradingStrategy");
const McqQuestionGradingStrategy = require("./mcqQuestionGradingStrategy");

class QuestionGradingStrategyFactory {
  getGradingStrategy(course, question, answer) {
    if (!question.questionType) {
      throw new Error();
    }

    switch (question.questionType) {
      case questionType.FILL_IN_THE_BLANK: {
        return new FillInBlankQuestionGradingStrategy(course, question, answer);
      }
      case questionType.MCQ: {
        return new McqQuestionGradingStrategy(course, question, answer);
      }
      case questionType.DESCRIPTIVE: {
        return new DescriptiveQuestionGradingStrategy(course, question, answer);
      }
    }
  }
}

module.exports = QuestionGradingStrategyFactory;
