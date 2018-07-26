pipeline {
    agent { label 'MSWPressIntegration-Linux' }
    environment {
        LAMBDA_ARN      = 'arn:aws:lambda:eu-west-1:747351050637:function:jwtAuthorizer'
        PROJECT_GIT_URL = 'vbustash.vistaprint.net/scm/mipi/on-demand-printing-service.git'
    }
    stages {
        stage('Build') {
            steps {
                sh '''#!/bin/bash
                      npm install
                      npm run package
                      VERSION=$(jq ".version" ./package.json | sed 's/"//g')
                      echo "VERSION='$VERSION'" > version.properties
                      echo "Built authorizer version $VERSION"
                '''
            }
        }
        stage('Dry Run Deployment') {
            when {
                expression { env.BRANCH_NAME ==~ /(PR-\d+)/ }
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'pressintegration-jenkins-master-iam',
                          accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh 'npm run deploy-dry'
                }
            }
        }
        stage('Deploy') {
            when {
                branch 'master'
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'pressintegration-jenkins-master-iam',
                          accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh 'npm run deploy'
                }
            }
        }
        stage('Tag Source') {
            when {
                branch 'master'
            }
            steps {
                withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'PressIntegrationSharedAccount', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD']]) {
                sh '''#!/bin/bash
                        source ./version.properties
                        echo "Tagging commit with version ${VERSION}"
                        git tag ${VERSION}
                        git tag -l
                        git push --force https://${GIT_USERNAME}:${GIT_PASSWORD}@${PROJECT_GIT_URL} refs/tags/${VERSION}:refs/tags/${VERSION}
                '''
                }
            }
        }
        stage('Success') {
            steps {
                script {
                    currentBuild.result = 'SUCCESS'
                }
            }
        }
    }
    post {
        failure {
            script {
                currentbuild.result = 'FAILURE'
            }
        }
        always {
            echo 'Done!'
            step([$class: 'Mailer',
                    notifyEveryUnstableBuild: true,
                    recipients: "mswpressintegration@vistaprint.com",
                    sendToIndividuals: true])
            cleanWs()
        }
    }
}