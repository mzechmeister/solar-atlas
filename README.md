# Sunspectrum
## Installation
Download the datasets from http://www.astro.physik.uni-goettingen.de/research/flux_atlas/ and put them in the cloned repository inside a folder data/.
Then run,
```
$ python3 dataset.py
$ python3 lod.py
```
which will create the files data/solar_atlas_V1 and data/solar_X (X: LOD Level).

To check if python formated everything correctly, make sure each line in the files created have 40 characters (not including the \t and \n, including those would result in 43 characters per line).
