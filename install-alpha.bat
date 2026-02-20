@echo off
FOR /F "delims=" %%i in ( '"C:\Users\Ouroboros\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" components copy-bundled-python' ) DO SET CLOUDSDK_PYTHON=%%i
"C:\Users\Ouroboros\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" components install alpha --quiet
