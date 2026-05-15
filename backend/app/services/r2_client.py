# UNUSED FOR NOW — DO NOT DELETE
# This file stays for future cloud-only mode

import os
import boto3
from dotenv import load_dotenv

load_dotenv()


def get_r2_client():
    raise RuntimeError("R2 is disabled in local-only mode")


def r2_bucket():
    raise RuntimeError("R2 is disabled in local-only mode")