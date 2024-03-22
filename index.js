import AWS from "aws-sdk";

// Configure DynamoDB client with Mumbai region
AWS.config.update({ region: "ap-south-1" });
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const {
    userId,
    topicId,
    numberOfEasyQuestions,
    numberOfMediumQuestions,
    numberofHardQuestions,
  } = event;

  // 1. Fetch all questions for the given topic
  const questions = await getQuestionsByTopic(topicId);

  // 2. Filter questions based on difficulty
  const easyQuestions = filterQuestionsByDifficulty(
    questions,
    "Easy",
    numberOfEasyQuestions
  );
  const mediumQuestions = filterQuestionsByDifficulty(
    questions,
    "Medium",
    numberOfMediumQuestions
  );
  const hardQuestions = filterQuestionsByDifficulty(
    questions,
    "Hard",
    numberofHardQuestions
  );

  // 3. Combine and shuffle questions while removing duplicates
  const allQuestions = easyQuestions.concat(mediumQuestions, hardQuestions);
  const filteredQuestions = removeAttemptedQuestions(allQuestions, userId);
  const finalQuestions = shuffleArray(filteredQuestions);

  // 4. Pick the desired number of questions
  const pickedQuestions = finalQuestions.slice(
    0,
    numberOfEasyQuestions + numberOfMediumQuestions + numberofHardQuestions
  );

  // 5. Return the list of question IDs
  const questionIds = pickedQuestions.map((question) => question.questionId);
  return questionIds;
};

// Function to get all questions for a topic from DynamoDB
async function getQuestionsByTopic(topicId) {
  const params = {
    TableName: "q_Questions",
    FilterExpression: "#topicId = :topicIdValue",
    ExpressionAttributeNames: { "#topicId": "topicId" },
    ExpressionAttributeValues: { ":topicIdValue": topicId },
  };

  const response = await docClient.scan(params).promise();
  return response.Items || [];
}

// Function to filter questions based on difficulty
function filterQuestionsByDifficulty(questions, difficulty, count) {
  return questions
    .filter((question) => question.difficulty === difficulty)
    .slice(0, count);
}

// Function to remove questions already attempted by the user
async function removeAttemptedQuestions(questions, userId) {
  const params = {
    TableName: "UserTestInstanceAnswer",
    FilterExpression: "#userId = :userIdValue",
    ExpressionAttributeNames: { "#userId": "userId" },
    ExpressionAttributeValues: { ":userIdValue": userId },
    ProjectionExpression: "qId",
  };

  const attemptedQuestions = await docClient.scan(params).promise();
  const attemptedQuestionIds = attemptedQuestions.Items
    ? attemptedQuestions.Items.map((item) => item.qId)
    : [];
  return questions.filter(
    (question) => !attemptedQuestionIds.includes(question.questionId)
  );
}

// Function to shuffle an array
function shuffleArray(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there are elements remaining to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
