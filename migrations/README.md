```bash
export IAM_TOKEN=$(yc iam create-token)
export YDB_CONNECTION_STRING=$(terraform -chdir=../tf output -raw migrate)
goose ydb "$YDB_CONNECTION_STRING&token=$IAM_TOKEN" up
```
