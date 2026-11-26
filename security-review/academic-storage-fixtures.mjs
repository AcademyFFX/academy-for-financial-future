import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
export async function createAcademicFixtures() {
 const root=await mkdtemp(join(tmpdir(),'aff-media-lab-'));
 const assets=[
 {id:'lesson',bucket:'aff-course-assets',key:'course/lesson.txt',audience:'student',published:true},
 {id:'draft',bucket:'aff-course-assets',key:'course/draft.txt',audience:'student',published:false},
 {id:'workbook',bucket:'aff-course-assets',key:'course/workbook.txt',audience:'student',published:true},
 {id:'key',bucket:'aff-course-assets',key:'course/answer-key.txt',audience:'instructor',published:false},
 {id:'assignment-a',bucket:'assignment-submissions',key:'a/submission.txt',audience:'assignment',owner:'student-a'},
 {id:'assignment-b',bucket:'assignment-submissions',key:'b/submission.txt',audience:'assignment',owner:'student-b'}
 ];
 try {
 for(const a of assets){
 const dir=join(root,a.bucket,a.key.split('/')[0]);
 await mkdir(dir,{recursive:true});
 await writeFile(join(root,a.bucket,a.key),'SYNTHETIC AFF TEST ONLY: '+a.id+'\n',{flag:'wx'});
 }
 const identities=['student-a','student-b','instructor-i','evaluator-e','staff-u'];
 const manifest={assets,identities,course:'synthetic-course',enrolled:['student-a'],entitled:['student-a'],instructors:['instructor-i'],evaluators:['evaluator-e']};
 assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 await writeFile(join(root,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
 return {root,manifest,cleanup:()=>rm(root,{recursive:true,force:true})};
 } catch(error){await rm(root,{recursive:true,force:true});throw error;}
}
