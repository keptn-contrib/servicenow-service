package credentials

import (
	"errors"
	"os"
	"strings"

	"github.com/keptn-contrib/servicenow-service/pkg/common"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type servicenowCredentials struct {
	Instance string `json:"SERVICENOW_INSTANCE" yaml:"SERVICENOW_INSTANCE"`
	User     string `json:"SERVICENOW_USER" yaml:"SERVICENOW_USER"`
	Password string `json:"SERVICENOW_PASSWORD" yaml:"SERVICENOW_PASSWORD"`
}

var namespace = getPodNamespace()

func getPodNamespace() string {
	ns := os.Getenv("POD_NAMESPACE")
	if ns == "" {
		return "keptn"
	}

	return ns
}

// GetGlobalServicenowCredentials gets servicenow url and credential values
func GetServicenowCredentials() (*servicenowCredentials, error) {
	secretName := "servicenow"

	kubeAPI, err := common.GetKubernetesClient()
	if err != nil {
		return nil, err
	}

	secret, err := kubeAPI.CoreV1().Secrets(namespace).Get(secretName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	if string(secret.Data["SERVICENOW_INSTANCE"]) == "" || string(secret.Data["SERVICENOW_USER"]) == "" || string(secret.Data["SERVICENOW_PASSWORD"]) == "" {
		return nil, errors.New("invalid or no ServiceNow credentials found. Requires at least SERVICENOW_INSTANCE, SERVICENOW_USER and SERVICENOW_PASSWORD in secret!")
	}

	snowCreds := &servicenowCredentials{}

	snowCreds.Instance = strings.Trim(string(secret.Data["SERVICENOW_INSTANCE"]), "\n")
	snowCreds.User = strings.Trim(string(secret.Data["SERVICENOW_USER"]), "\n")
	snowCreds.Password = strings.Trim(string(secret.Data["SERVICENOW_PASSWORD"]), "\n")

	return snowCreds, nil
}
