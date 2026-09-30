app.controller('FeedbackController', function ($scope, FeedbackService) {
    $scope.feedback = { name: '', email: '', message: '' };
    $scope.submitted = false;

    $scope.submitFeedback = function () {
        if (!$scope.feedback.name || !$scope.feedback.message) return;
        FeedbackService.add({
            name: $scope.feedback.name,
            email: $scope.feedback.email,
            message: $scope.feedback.message
        });
        $scope.submitted = true;
    };
});
