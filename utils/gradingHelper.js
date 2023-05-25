const fetch = require("node-fetch");

exports.formatScore = (threshold, score, totalMarks) => {
  let marks = 0;
  threshold.get(`${totalMarks}`).forEach((mean) => {
    if (score >= mean) {
      marks += 1;
    } else {
      return marks;
    }
  });

  return marks;
};

exports.gradeAnswerWithAI = async (
  course,
  markingScheme,
  answer,
  totalMarks
) => {
  const { marks, semanticTextSimilarity } = await fetch(
    `${process.env.AI_GRADING_SERVICE_URL}/${course.courseEmbeddingUrl}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markingScheme: markingScheme,
        studentResponse: answer,
      }),
    }
  )
    .then((response) => response.json())
    .then((data) => ({
      marks: this.formatScore(course.threshold, data.score, totalMarks),
      semanticTextSimilarity: data.score,
    }));

  return { marks, semanticTextSimilarity };
};
