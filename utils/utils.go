package utils

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"gopkg.in/yaml.v2"

	keptnutils "github.com/keptn/go-utils/pkg/utils"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/client-go/kubernetes/typed/core/v1"
)

type servicenowCredentials struct {
	Instance string `json:"SERVICENOW_INSTANCE" yaml:"SERVICENOW_INSTANCE"`
	User     string `json:"SERVICENOW_USER" yaml:"SERVICENOW_USER"`
	Password string `json:"SERVICENOW_PASSWORD" yaml:"SERVICENOW_PASSWORD"`
}

// getGlobalServicenowCredentialsreturns the global ServiceNow credentials
func GetGlobalServicenowCredentials(kubeClient v1.CoreV1Interface, logger *keptnutils.Logger) (string, string, string, error) {
	secretName := "servicenow"
	// check if secret exists
	secret, err := kubeClient.Secrets("keptn").Get(secretName, metav1.GetOptions{})

	if err != nil {
		log.Println(err)
		return "", "", "", fmt.Errorf("could not find secret '%s' in namespace keptn", secretName)
	}

	secretValue, found := secret.Data["servicenow-credentials"]

	if !found {
		return "", "", "", fmt.Errorf("Credentials %s does not contain a field 'servicenow-credentials'", secretName)
	}

	/*
		data format:
		instance: string
		user: string
		password: string
	*/

	snowCreds := &servicenowCredentials{}
	err = yaml.Unmarshal(secretValue, snowCreds)

	if err != nil {
		return "", "", "", fmt.Errorf("invalid credentials format found in secret '%s'", secretName)
	}

	if snowCreds.Instance == "" {
		return "", "", "", errors.New("Instance URL must not be empty")
	}
	if snowCreds.User == "" {
		return "", "", "", errors.New("User must not be empty")
	}
	if snowCreds.Password == "" {
		return "", "", "", errors.New("Password must not be empty")
	}

	servicenowURL := ""

	// ensure URL always has http or https in front
	if strings.HasPrefix(snowCreds.Instance, "https://") || strings.HasPrefix(snowCreds.Instance, "http://") {
		servicenowURL = snowCreds.Instance
	} else {
		servicenowURL = "https://" + snowCreds.Instance + "/api/global/em/jsonv2"
	}

	return servicenowURL, snowCreds.User, snowCreds.Password, nil
}
