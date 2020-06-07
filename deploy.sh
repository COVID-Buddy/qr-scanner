#!/bin/bash

ng build --prod
docker build -t asia.gcr.io/matej-kramny/secret-qr .
docker push asia.gcr.io/matej-kramny/secret-qr