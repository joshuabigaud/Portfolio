import { getContent } from './content.mjs';

/** Sample records illustrate the template only; this module is never published. */
export function getDemoContent(baseContent = getContent()) {
  const data = structuredClone(baseContent);
  if (data.skills.length === 0) {
    data.skillCategories = [
      { id: 'languages', label: 'Languages', color: '#e9dfa8' },
      { id: 'frontend', label: 'Frontend', color: '#dfdcea' },
      { id: 'backend', label: 'Backend', color: '#d9e3da' },
      { id: 'tools', label: 'Tools', color: '#e6d8cd' },
    ];
    data.skills = [
      ['javascript', 'JavaScript', 'Js', 'languages'],
      ['typescript', 'TypeScript', 'Ts', 'languages'],
      ['python', 'Python', 'Py', 'languages'],
      ['sql', 'SQL', 'Sq', 'languages'],
      ['html', 'HTML', 'Ht', 'frontend'],
      ['css', 'CSS', 'Cs', 'frontend'],
      ['react', 'React', 'Re', 'frontend'],
      ['accessibility', 'Accessibility', 'Ax', 'frontend'],
      ['node', 'Node.js', 'No', 'backend'],
      ['rest', 'REST APIs', 'Ap', 'backend'],
      ['postgresql', 'PostgreSQL', 'Pg', 'backend'],
      ['redis', 'Redis', 'Rd', 'backend'],
      ['git', 'Git', 'Gt', 'tools'],
      ['docker', 'Docker', 'Do', 'tools'],
      ['testing', 'Testing', 'Te', 'tools'],
      ['design-systems', 'Design systems', 'Ds', 'tools'],
    ].map(([id, name, symbol, categoryId]) => ({
      id: `sample-${id}`, name, symbol, categoryId, sample: true,
      description: 'Sample skill for the template preview. Replace this record with your own supported experience.',
    }));
  }
  if (data.timeline.length === 0) data.timeline = [
    { id: 'sample-learn', year: 'Learn', type: 'education', title: 'A learning chapter', description: 'Sample journey entry. Add your own course, qualification, or learning milestone.', tags: ['Sample content'] },
    { id: 'sample-build', year: 'Build', type: 'experience', title: 'An independent project', description: 'Sample journey entry. Describe a project, your contribution, and what you learned.', tags: ['Sample content'] },
    { id: 'sample-next', year: 'Next', type: 'milestone', title: 'Your next chapter', description: 'Sample journey entry. Describe the kind of opportunity or collaboration you are looking for.', tags: ['Sample content'] },
  ].map(item => ({ ...item, sample: true }));
  if (data.achievements.length === 0) data.achievements = [
    { id: 'sample-practice', title: 'Practice platform', category: 'Sample achievement', description: 'A fictional counter demonstrating numeric results.', value: 120, suffix: '+', icon: '↗' },
    { id: 'sample-event', title: 'Community event', category: 'Sample achievement', description: 'A fictional result demonstrating text highlights.', displayText: 'Finalist', icon: '✳' },
    { id: 'sample-learning', title: 'Learning milestones', category: 'Sample achievement', description: 'Replace this example with a supported accomplishment.', value: 12, icon: '✦' },
    { id: 'sample-collaboration', title: 'A shared milestone', category: 'Sample achievement', description: 'A fictional team highlight for the template preview.', displayText: 'Together', icon: '◎' },
  ].map(item => ({ ...item, sample: true }));
  return data;
}
