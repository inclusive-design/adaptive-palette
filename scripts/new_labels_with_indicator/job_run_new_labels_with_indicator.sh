#!/bin/bash

# Copyright The Adaptive Palette copyright holders
# See the AUTHORS.md file at the top-level directory of this distribution and at
# https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
#
# Licensed under the New BSD license. You may not use this file except in
# compliance with this License.
#
# You may obtain a copy of the License at
# https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
#
# A Slurm job that runs run_new_labels_with_indicator.py on a GPU cluster. Replace each
# <...> placeholder before submitting it with `sbatch`.

#SBATCH --job-name=new_labels_with_indicator_gemma-4-31B-it
#SBATCH --time 2-00:00
#SBATCH --nodes=1
#SBATCH --gpus-per-node=h100:1
#SBATCH --mem=64G
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=4
#SBATCH --account=<your-allocation>
#SBATCH --output=%x.o%j
#SBATCH --mail-user=<your-email>
#SBATCH --mail-type=START,END,FAIL

 
pip install --upgrade pip
module load StdEnv/2023 python/3.11

virtualenv --no-download $SLURM_TMPDIR/env
source $SLURM_TMPDIR/env/bin/activate

pip install  --no-index --upgrade pip

module load StdEnv/2023

pip install torch==2.12.0 transformers==5.12.1 sentencepiece==0.2.1 accelerate==1.14.0

pip list

echo "Generate labels when indicators are applied to BCI-AV vocabulary: job ID $SLURM_JOB_ID on nodes $SLURM_JOB_NODELIST."
python <path-to>/run_new_labels_with_indicator.py --model <path-to-model>/gemma-4-31B-it --prompts <path-to>/new_labels_with_indicator_prompts.jsonl --output <path-to-results>/new_labels_with_indicator.jsonl
