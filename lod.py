import numpy as np
import json
from os.path import getsize

WINDOW_SIZE = 16
MAX_ELEMENTS = 4000

filename = 'data/solar_atlas_V1'
data = np.loadtxt(filename)
xlim = [np.min(data[:,0]), np.max(data[:,0])]
print('finished loading data.')
print('----------------')


class LOD:
    def __init__(self, level, data):
        self.level = level
        self.data = data
        self.LSIZE = WINDOW_SIZE**level
        self.nele = int(np.ceil(len(data)/self.LSIZE))
        self.ymin=[]
        self.ymax=[]
        self.xmean=[]
        self.filename = 'data/solar_'+str(level)
        self.fout = open(self.filename, 'w')

    def __del__(self):
        if not self.fout.closed:
            self.fout.close()

    def process(self):
        lin = np.linspace(np.min(self.data[:,0]), np.max(self.data[:,0]), self.nele+1)
        bin_width = lin[1]-lin[0]
        n = 0
        l = []
        fin = []
        for i in range(len(self.data[:,0])):
            if self.data[:,0][i] >= lin[n] and self.data[:,0][i] <= lin[n+1]:
                l.append(self.data[:,1][i])
            else:
                fin.append(np.array([lin[n]+bin_width, np.min(l), np.max(l)]))
                n = n+1
                while self.data[:,0][i] > lin[n+1]:
                    fin.append(np.array([lin[n]+bin_width, 0, 0]))
                    n = n+1
                l = []
                l.append(self.data[:,1][i])
        fin.append(np.array([lin[n]+bin_width, np.min(l), np.max(l)]))
        stacking = fin[0]
        for i in range(1,len(fin)):
            stacking = np.vstack((stacking, fin[i]))
        self.xmean = stacking[:,0]
        self.ymin = stacking[:,1]
        self.ymax = stacking[:,2]

    def write_to_file(self):
        precision = 10
        maxlength = len(str(round(np.max(self.xmean)))) + precision + 1
        for i in range(0, self.nele):
            self.fout.write('%0*.*f\t%.*f\t%.*f\n'%(maxlength, precision, self.xmean[i], precision, self.ymin[i], precision, self.ymax[i]))
        self.fout.close()
        print('created lod-file: ' + self.filename + '.')
        #end fout stream and create descriptor
        self.descriptor = {
                "fileName": self.filename,
                "fileSize": getsize(self.filename),
                "level": self.level,
                "nElements": self.nele
                }

    def reDescriptor(self):
        return self.descriptor

nLodLevels = int(np.ceil(np.log(len(data)/MAX_ELEMENTS)/np.log(WINDOW_SIZE)))
lodDescriptor = []
print('processing ' + str(nLodLevels) + ' levels of detail.')
print('----------------')
for i in range(1, nLodLevels+1):
    p = LOD(i, data)
    p.process()
    p.write_to_file()
    lodDescriptor.append(p.reDescriptor())
print('----------------')

descriptor = {
        "fileName": filename,
        "fileSize": getsize(filename),
        "nElements": len(data),
        "xMin": xlim[0],
        "xMax": xlim[1],
        "maxElements": MAX_ELEMENTS,
        "windowSize": WINDOW_SIZE,
        "lodFiles": lodDescriptor
        }
with open('data/descriptor.json', 'w') as outf:
    json.dump(descriptor, outf)
print('wrote to data/descriptor.json.\n exiting.')
