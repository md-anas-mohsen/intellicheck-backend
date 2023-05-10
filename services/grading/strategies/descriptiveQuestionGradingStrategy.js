const fetch = require("node-fetch");

const MESSAGES = require("../../../constants/messages");
const QuestionGradingStrategy = require("./questionGradingStrategy");

class DescriptiveQuestionGradingStrategy extends QuestionGradingStrategy {
  #AI_GRADING_SERVICE_URL;
  constructor(course, question, answer) {
    super(course, question, answer);
    this.#AI_GRADING_SERVICE_URL = process.env.AI_GRADING_SERVICE_URL;

    if (!this.#AI_GRADING_SERVICE_URL) {
      throw new Error(MESSAGES.AI_GRADING_SERVICE_URL_NOT_PROVIDED);
    }
  }

  #formatScore(threshold, score, totalMarks) {
    let marks = 0;
    threshold.get(`${totalMarks}`).forEach((mean) => {
      if (score >= mean) {
        marks += 1;
      } else {
        return marks;
      }
    });

    return marks;
  }

  async #computeMarks(course, question, answer) {
    const marks = await fetch(
      `${this.#AI_GRADING_SERVICE_URL}/${course.courseEmbeddingUrl}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markingScheme: question.msAnswer,
          studentResponse: answer,
        }),
      }
    )
      .then((response) => response.json())
      .then((data) =>
        this.#formatScore(course.threshold, data.score, question.totalMarks)
      );

    return { question: question._id, marks };
  }

  async gradeAnswer() {
    return await this.#computeMarks(this._course, this._question, this._answer);
  }
}

module.exports = DescriptiveQuestionGradingStrategy;
