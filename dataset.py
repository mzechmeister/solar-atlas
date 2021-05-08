import numpy as np
data1 = np.loadtxt('data/solar_atlas_V1_405-1065')
data2 = np.loadtxt('data/solar_atlas_V1_1000-2300')

raw = np.concatenate((data1,data2),axis=0)
raw2 = np.concatenate((data1,data2),axis=0)
raw[:,0] = 10**10/(100*raw[:,0])
col=0
sorted_data= raw[raw[:,col].argsort()]
sorted_data2= raw2[raw2[:,col].argsort()]
fout = open('data/solar_atlas_V1', 'w')
precision = 10
maxlength = precision + 1 + len(str(int(max(sorted_data[:,0]))))

for i in range(0,len(sorted_data[:,0])):
    fout.write('%0*.*f\t%0.*f\t%0.*f\n'%(maxlength, precision, sorted_data[i,0], precision, sorted_data[i,1], precision, sorted_data[i,2]))
fout.close()
