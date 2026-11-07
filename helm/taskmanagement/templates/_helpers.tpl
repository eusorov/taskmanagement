{{/* Release-wide name prefix: the release name, plus the chart name unless the release name contains it */}}
{{- define "taskmanagement.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "taskmanagement.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/part-of: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/* Usage: include "taskmanagement.selectorLabels" (list . "backend") */}}
{{- define "taskmanagement.selectorLabels" -}}
app.kubernetes.io/name: {{ index . 1 }}
app.kubernetes.io/instance: {{ (index . 0).Release.Name }}
{{- end -}}

{{/* The Bitnami subchart's name (its common.names.fullname): its Service and generated Secret both use it */}}
{{- define "taskmanagement.postgresql.fullname" -}}
{{- if contains "postgresql" .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-postgresql" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/* Database connection, shared by the backend and the migration Job */}}
{{- define "taskmanagement.datasourceEnv" -}}
- name: SPRING_DATASOURCE_URL
  value: jdbc:postgresql://{{ include "taskmanagement.postgresql.fullname" . }}:5432/{{ .Values.postgresql.auth.database }}
- name: SPRING_DATASOURCE_USERNAME
  value: {{ .Values.postgresql.auth.username }}
- name: SPRING_DATASOURCE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "taskmanagement.postgresql.fullname" . }}
      key: password
# JSON logs to stdout
- name: LOGGING_STRUCTURED_FORMAT_CONSOLE
  value: ecs
{{- end -}}

{{/* Pod settings for every pod of this chart: no Kubernetes API token, no service-link variables */}}
{{- define "taskmanagement.podDefaults" -}}
automountServiceAccountToken: false
enableServiceLinks: false
{{- end -}}

{{/* Usage: include "taskmanagement.podSecurityContext" 10001 */}}
{{- define "taskmanagement.podSecurityContext" -}}
securityContext:
  runAsNonRoot: true
  runAsUser: {{ . }}
  runAsGroup: {{ . }}
  seccompProfile:
    type: RuntimeDefault
{{- end -}}

{{- define "taskmanagement.containerSecurityContext" -}}
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
{{- end -}}
